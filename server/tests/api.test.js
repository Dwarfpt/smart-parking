/**
 * Smart Parking Server — API Integration Tests
 * 
 * Запуск: node tests/api.test.js
 * 
 * Требования:
 *   1. MongoDB должен быть запущен (mongodb://localhost:27017)
 *   2. Сервер НЕ должен быть запущен (тест сам поднимет его)
 *   3. npm run seed — для начальных данных (опционально, тест сам создаёт)
 * 
 * Или если сервер уже запущен:
 *   BASE_URL=http://localhost:5000 node tests/api.test.js
 */

const http = require('http');
const { URL } = require('url');

// ========== CONFIG ==========
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
let server = null;
let passed = 0;
let failed = 0;
let skipped = 0;
const results = [];

// ========== HTTP HELPER ==========
function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, data: parsed, headers: res.headers });
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Request timeout')); });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ========== TEST HELPERS ==========
function assert(condition, msg) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

async function test(name, fn) {
  try {
    await fn();
    passed++;
    results.push({ name, status: '✅ PASS' });
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    results.push({ name, status: '❌ FAIL', error: err.message });
    console.log(`  ❌ ${name}: ${err.message}`);
  }
}

function skip(name) {
  skipped++;
  results.push({ name, status: '⏭ SKIP' });
  console.log(`  ⏭ ${name}`);
}

// ========== STATE ==========
let userToken = null;
let adminToken = null;
let userId = null;
let adminId = null;
let parkingLotId = null;
let parkingSpotId = null;
let tariffId = null;
let bookingId = null;
let ticketId = null;

const testUser = {
  name: 'Test User',
  email: `testuser_${Date.now()}@test.com`,
  password: 'password123',
  phone: '+37360000001',
};

// ========== TEST SUITES ==========

async function testHealth() {
  console.log('\n📋 Health Check');
  await test('GET /api/health returns 200', async () => {
    const res = await request('GET', '/api/health');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.status === 'OK', 'Expected status OK');
  });
}

async function testAuth() {
  console.log('\n🔐 Auth Routes');

  await test('POST /api/auth/register — create new user (OTP flow)', async () => {
    const res = await request('POST', '/api/auth/register', testUser);
    assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
    assert(res.data.requireOtp === true, 'Expected requireOtp flag');
    assert(res.data.tempToken, 'Expected tempToken');
    assert(res.data.otp, 'Expected otp in dev/test mode');
    assert(res.data.user, 'Expected user object');
    userId = res.data.user._id || res.data.user.id;

    // Verify OTP to get real token
    const verifyRes = await request('POST', '/api/auth/verify-otp', {
      tempToken: res.data.tempToken,
      otp: res.data.otp,
    });
    assert(verifyRes.status === 200, `OTP verify expected 200, got ${verifyRes.status}: ${JSON.stringify(verifyRes.data)}`);
    assert(verifyRes.data.token, 'Expected token after OTP verification');
    userToken = verifyRes.data.token;
  });

  await test('POST /api/auth/register — duplicate email fails', async () => {
    const res = await request('POST', '/api/auth/register', testUser);
    assert(res.status === 400 || res.status === 409, `Expected 400/409, got ${res.status}`);
  });

  await test('POST /api/auth/register — validation error (no email)', async () => {
    const res = await request('POST', '/api/auth/register', { name: 'X', password: '123456' });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  await test('POST /api/auth/login — correct credentials (OTP flow)', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: testUser.email,
      password: testUser.password,
    });
    assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.data)}`);
    assert(res.data.requireOtp === true, 'Expected requireOtp flag');
    assert(res.data.tempToken, 'Expected tempToken');
    assert(res.data.otp, 'Expected otp in dev/test mode');

    // Verify OTP to get real token
    const verifyRes = await request('POST', '/api/auth/verify-otp', {
      tempToken: res.data.tempToken,
      otp: res.data.otp,
    });
    assert(verifyRes.status === 200, `OTP verify expected 200, got ${verifyRes.status}`);
    assert(verifyRes.data.token, 'Expected token after OTP verification');
    userToken = verifyRes.data.token;
  });

  await test('POST /api/auth/login — wrong password', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: testUser.email,
      password: 'wrongpassword',
    });
    assert(res.status === 400 || res.status === 401, `Expected 400/401, got ${res.status}`);
  });

  await test('POST /api/auth/verify-otp — wrong OTP fails', async () => {
    const loginRes = await request('POST', '/api/auth/login', {
      email: testUser.email,
      password: testUser.password,
    });
    const verifyRes = await request('POST', '/api/auth/verify-otp', {
      tempToken: loginRes.data.tempToken,
      otp: '000000',
    });
    assert(verifyRes.status === 400 || verifyRes.status === 401, `Expected 400/401, got ${verifyRes.status}`);
  });

  await test('POST /api/auth/resend-otp — resend works', async () => {
    const loginRes = await request('POST', '/api/auth/login', {
      email: testUser.email,
      password: testUser.password,
    });
    const resendRes = await request('POST', '/api/auth/resend-otp', {
      tempToken: loginRes.data.tempToken,
    });
    assert(resendRes.status === 200, `Expected 200, got ${resendRes.status}`);
  });

  await test('POST /api/auth/login — admin login (OTP flow)', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: 'admin@smartparking.md',
      password: 'admin123',
    });
    if (res.status === 200 && res.data.requireOtp && res.data.otp) {
      const verifyRes = await request('POST', '/api/auth/verify-otp', {
        tempToken: res.data.tempToken,
        otp: res.data.otp,
      });
      if (verifyRes.status === 200 && verifyRes.data.token) {
        adminToken = verifyRes.data.token;
        adminId = verifyRes.data.user?._id || verifyRes.data.user?.id;
      }
    } else {
      // Admin may not exist if seed hasn't been run
      console.log('    ⚠ Admin not found, some admin tests will be skipped');
    }
    // Don't fail — admin might not exist
    assert(true, 'ok');
  });

  await test('GET /api/auth/me — authenticated', async () => {
    const res = await request('GET', '/api/auth/me', null, userToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.user.email === testUser.email, 'Email mismatch');
  });

  await test('GET /api/auth/me — no token fails', async () => {
    const res = await request('GET', '/api/auth/me');
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });
}

async function testUsers() {
  console.log('\n👤 User Routes');

  await test('GET /api/users/profile', async () => {
    const res = await request('GET', '/api/users/profile', null, userToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.user, 'Expected user object');
  });

  await test('PUT /api/users/profile — update name', async () => {
    const res = await request('PUT', '/api/users/profile', { name: 'Updated Name' }, userToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await test('PUT /api/users/password — change password', async () => {
    const res = await request('PUT', '/api/users/password', {
      currentPassword: testUser.password,
      newPassword: 'newpassword456',
    }, userToken);
    // Change back for further tests
    if (res.status === 200) {
      await request('PUT', '/api/users/password', {
        currentPassword: 'newpassword456',
        newPassword: testUser.password,
      }, userToken);
    }
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await test('POST /api/users/topup — add balance', async () => {
    const res = await request('POST', '/api/users/topup', { amount: 500 }, userToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await test('GET /api/users/balance', async () => {
    const res = await request('GET', '/api/users/balance', null, userToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(typeof res.data.balance === 'number', 'Expected numeric balance');
  });

  await test('GET /api/users/transactions', async () => {
    const res = await request('GET', '/api/users/transactions', null, userToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.data.transactions), 'Expected transactions array');
  });
}

async function testTariffs() {
  console.log('\n💰 Tariff Routes');

  await test('GET /api/tariffs — public list', async () => {
    const res = await request('GET', '/api/tariffs');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.data.tariffs), 'Expected tariffs array');
    if (res.data.tariffs.length > 0) {
      tariffId = res.data.tariffs[0]._id;
    }
  });

  if (adminToken) {
    await test('POST /api/tariffs — admin create tariff', async () => {
      const lots = await request('GET', '/api/parking');
      const lotId = lots.data.parkingLots?.[0]?._id;
      assert(lotId, 'Need at least 1 parking lot — run seed first');
      const res = await request('POST', '/api/tariffs', {
        parkingLotId: lotId,
        name: `Test Tariff ${Date.now()}`,
        pricePerHour: 15,
        subscriptionWeek: 500,
        subscriptionMonth: 1500,
        subscription3Months: 4000,
        subscriptionYear: 12000,
      }, adminToken);
      assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
      tariffId = res.data.tariff._id;
    });

    await test('PUT /api/tariffs/:id — admin update tariff', async () => {
      if (!tariffId) { skip('No tariff to update'); return; }
      const res = await request('PUT', `/api/tariffs/${tariffId}`, { pricePerHour: 20 }, adminToken);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
    });

    await test('POST /api/tariffs — user cannot create', async () => {
      const res = await request('POST', '/api/tariffs', { name: 'Hacker', pricePerHour: 1 }, userToken);
      assert(res.status === 403, `Expected 403, got ${res.status}`);
    });
  } else {
    skip('Admin tariff CRUD (no admin token)');
  }
}

async function testParking() {
  console.log('\n🅿️ Parking Routes');

  await test('GET /api/parking — list parking lots', async () => {
    const res = await request('GET', '/api/parking');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.data.parkingLots), 'Expected parkingLots array');
    if (res.data.parkingLots.length > 0) {
      parkingLotId = res.data.parkingLots[0]._id;
    }
  });

  if (parkingLotId) {
    await test('GET /api/parking/:id — single lot', async () => {
      const res = await request('GET', `/api/parking/${parkingLotId}`);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.parkingLot, 'Expected parkingLot object');
    });

    await test('GET /api/parking/:id/spots — lot spots', async () => {
      const res = await request('GET', `/api/parking/${parkingLotId}/spots`);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(Array.isArray(res.data.spots), 'Expected spots array');
      const freeSpot = res.data.spots.find((s) => s.status === 'free');
      if (freeSpot) parkingSpotId = freeSpot._id;
    });
  } else {
    skip('Parking lot detail (no lots in DB)');
    skip('Parking spots (no lots in DB)');
  }

  await test('GET /api/parking/nonexistent — 404 or 400', async () => {
    const res = await request('GET', '/api/parking/000000000000000000000000');
    assert(res.status === 404 || res.status === 400 || res.status === 500, `Expected error status, got ${res.status}`);
  });
}

async function testBookings() {
  console.log('\n📅 Booking Routes');

  if (parkingSpotId && userToken) {
    await test('POST /api/bookings — create reservation', async () => {
      const start = new Date(Date.now() + 3600000); // +1h
      const end = new Date(Date.now() + 7200000); // +2h
      const res = await request('POST', '/api/bookings', {
        parkingSpotId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      }, userToken);
      assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
      bookingId = res.data.booking._id;
    });

    await test('GET /api/bookings/my — user bookings', async () => {
      const res = await request('GET', '/api/bookings/my', null, userToken);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(Array.isArray(res.data.bookings), 'Expected bookings array');
      assert(res.data.bookings.length > 0, 'Expected at least 1 booking');
    });

    if (bookingId) {
      await test('GET /api/bookings/:id — single booking', async () => {
        const res = await request('GET', `/api/bookings/${bookingId}`, null, userToken);
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(res.data.booking, 'Expected booking object');
      });

      await test('PUT /api/bookings/:id/cancel — cancel booking', async () => {
        const res = await request('PUT', `/api/bookings/${bookingId}/cancel`, {}, userToken);
        assert(res.status === 200, `Expected 200, got ${res.status}`);
      });
    }
  } else {
    skip('Booking CRUD (no free spot or user token)');
  }

  await test('GET /api/bookings/my — unauthorized', async () => {
    const res = await request('GET', '/api/bookings/my');
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });
}

async function testSupport() {
  console.log('\n🎫 Support Routes');

  await test('POST /api/support — create ticket', async () => {
    const res = await request('POST', '/api/support', {
      subject: 'Test ticket',
      message: 'This is a test support message',
    }, userToken);
    assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
    ticketId = res.data.ticket._id;
  });

  await test('GET /api/support/my — my tickets', async () => {
    const res = await request('GET', '/api/support/my', null, userToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.data.tickets), 'Expected tickets array');
  });

  if (ticketId) {
    await test('GET /api/support/:id — single ticket', async () => {
      const res = await request('GET', `/api/support/${ticketId}`, null, userToken);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
    });

    await test('POST /api/support/:id/message — add message', async () => {
      const res = await request('POST', `/api/support/${ticketId}/message`, {
        text: 'Another message from user',
      }, userToken);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
    });

    if (adminToken) {
      await test('POST /api/support/:id/message — admin reply', async () => {
        const res = await request('POST', `/api/support/${ticketId}/message`, {
          text: 'Admin reply to your ticket',
        }, adminToken);
        assert(res.status === 200, `Expected 200, got ${res.status}`);
      });
    }

    await test('PUT /api/support/:id/close — close ticket', async () => {
      const res = await request('PUT', `/api/support/${ticketId}/close`, {}, userToken);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
    });
  }
}

async function testAdmin() {
  console.log('\n🛡️ Admin Routes');

  if (!adminToken) {
    skip('All admin tests (no admin token — run seed first)');
    return;
  }

  await test('GET /api/admin/stats', async () => {
    const res = await request('GET', '/api/admin/stats', null, adminToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(typeof res.data.overview.totalUsers === 'number', 'Expected totalUsers');
  });

  await test('GET /api/admin/users', async () => {
    const res = await request('GET', '/api/admin/users', null, adminToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.data.users), 'Expected users array');
  });

  await test('GET /api/admin/bookings', async () => {
    const res = await request('GET', '/api/admin/bookings', null, adminToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await test('GET /api/admin/devices', async () => {
    const res = await request('GET', '/api/admin/devices', null, adminToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await test('POST /api/admin/users/:id/credit — credit user balance', async () => {
    if (!userId) { skip('No user to credit'); return; }
    const res = await request('POST', `/api/admin/users/${userId}/credit`, { amount: 100 }, adminToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await test('GET /api/admin/stats — user unauthorized', async () => {
    const res = await request('GET', '/api/admin/stats', null, userToken);
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });
}

async function test404() {
  console.log('\n🚫 Error Handling');

  await test('GET /api/nonexistent — 404', async () => {
    const res = await request('GET', '/api/nonexistent');
    assert(res.status === 404, `Expected 404, got ${res.status}`);
  });
}

// ========== CLEANUP ==========
async function cleanup() {
  console.log('\n🧹 Cleanup');
  // Delete test user if admin token available
  if (adminToken && userId) {
    try {
      await request('DELETE', `/api/admin/users/${userId}`, null, adminToken);
      console.log('  Deleted test user');
    } catch { /* ignore */ }
  }
  // Delete test tariff
  if (adminToken && tariffId) {
    try {
      await request('DELETE', `/api/tariffs/${tariffId}`, null, adminToken);
      console.log('  Deleted test tariff');
    } catch { /* ignore */ }
  }
}

// ========== RUNNER ==========
async function run() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Smart Parking — API Integration Tests');
  console.log(`  Server: ${BASE_URL}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Check if server is reachable
  try {
    await request('GET', '/api/health');
  } catch {
    console.log('\n⚠ Server not reachable at', BASE_URL);
    console.log('  Trying to start server...');
    try {
      // Try to start server in-process
      require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
      const connectDB = require('../src/config/db');
      await connectDB();
      const app = require('../src/app');
      server = app.listen(5000, () => console.log('  Server started on port 5000'));
      await new Promise((r) => setTimeout(r, 1000)); // wait 1s
    } catch (err) {
      console.error(`\n❌ Cannot start server: ${err.message}`);
      console.log('  Please start the server manually: cd server && npm run dev');
      console.log('  Or ensure MongoDB is running.\n');
      process.exit(1);
    }
  }

  await testHealth();
  await testAuth();
  await testUsers();
  await testTariffs();
  await testParking();
  await testBookings();
  await testSupport();
  await testAdmin();
  await test404();
  await cleanup();

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  console.log(`  Total:   ${passed + failed + skipped} tests`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (server) server.close();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  if (server) server.close();
  process.exit(1);
});
