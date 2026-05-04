import 'package:flutter_test/flutter_test.dart';
import 'package:smart_parking/main.dart';

void main() {
  testWidgets('App renders splash screen', (WidgetTester tester) async {
    await tester.pumpWidget(const SmartParkingApp());
    expect(find.text('Smart Parking'), findsOneWidget);
  });
}
