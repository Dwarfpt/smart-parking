// Маршруты поддержки — тикеты, сообщения, закрытие
const router = require('express').Router();
const { body } = require('express-validator');
const { auth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const SupportTicket = require('../models/SupportTicket');

router.use(auth);

// — Создание тикета —
router.post(
  '/',
  [
    body('subject').trim().notEmpty().withMessage('Subject is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
  ],
  validate,
  async (req, res) => {
    try {
      const { subject, message } = req.body;

      const ticket = await SupportTicket.create({
        userId: req.user._id,
        subject,
        messages: [
          {
            senderId: req.user._id,
            senderRole: req.user.role,
            text: message,
          },
        ],
      });

      // Уведомление админам
      const io = req.app.get('io');
      if (io) {
        io.emit('support:new', { ticket });
      }

      res.status(201).json({ message: 'Ticket created', ticket });
    } catch (error) {
      console.error('Ошибка создания тикета:', error);
      res.status(500).json({ message: 'Server error.' });
    }
  }
);

// — Мои тикеты —
router.get('/my', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { userId: req.user._id };
    if (status) filter.status = status;

    const tickets = await SupportTicket.find(filter)
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ tickets });
  } catch (error) {
    console.error('Ошибка получения моих тикетов:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// — Все тикеты (админ) —
router.get('/all', requireRole('admin'), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const tickets = await SupportTicket.find(filter)
      .populate('userId', 'name email')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await SupportTicket.countDocuments(filter);

    res.json({
      tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Ошибка получения всех тикетов:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// — Детали тикета —
router.get('/:id', async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    // Если не админ — только свои
    if (req.user.role !== 'admin') {
      filter.userId = req.user._id;
    }

    const ticket = await SupportTicket.findOne(filter)
      .populate('userId', 'name email')
      .populate('messages.senderId', 'name email');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    res.json({ ticket });
  } catch (error) {
    console.error('Ошибка получения тикета:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// — Добавление сообщения —
router.post(
  '/:id/message',
  [body('text').trim().notEmpty().withMessage('Message text is required')],
  validate,
  async (req, res) => {
    try {
      const filter = { _id: req.params.id };
      if (req.user.role !== 'admin') {
        filter.userId = req.user._id;
      }

      const ticket = await SupportTicket.findOne(filter);
      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found.' });
      }

      if (ticket.status === 'closed') {
        return res.status(400).json({ message: 'Cannot add messages to a closed ticket.' });
      }

      ticket.messages.push({
        senderId: req.user._id,
        senderRole: req.user.role,
        text: req.body.text,
      });

      // Если админ отвечает — меняем статус на in-progress
      if (req.user.role === 'admin' && ticket.status === 'open') {
        ticket.status = 'in-progress';
      }

      await ticket.save();

      // WebSocket рассылка
      const io = req.app.get('io');
      if (io) {
        io.emit('support:message', {
          ticketId: ticket._id,
          message: ticket.messages[ticket.messages.length - 1],
        });
      }

      res.json({ message: 'Message added', ticket });
    } catch (error) {
      console.error('Ошибка добавления сообщения:', error);
      res.status(500).json({ message: 'Server error.' });
    }
  }
);

// — Закрытие тикета —
router.put('/:id/close', async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.role !== 'admin') {
      filter.userId = req.user._id;
    }

    const ticket = await SupportTicket.findOneAndUpdate(
      filter,
      { status: 'closed' },
      { new: true }
    );

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    res.json({ message: 'Ticket closed', ticket });
  } catch (error) {
    console.error('Ошибка закрытия тикета:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
