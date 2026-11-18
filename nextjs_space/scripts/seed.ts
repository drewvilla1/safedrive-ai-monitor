import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { calculateRiskScore } from '../lib/risk-scoring';
import { getSeverityFromScore, pickWarning, WARNING_TEMPLATES } from '../lib/warning-templates';

const prisma = new PrismaClient();

const DRIVER_NAMES = [
  { name: 'Marcus Johnson', vehicle: 'VH-1001', type: 'Sedan' },
  { name: 'Sarah Chen', vehicle: 'VH-1002', type: 'SUV' },
  { name: 'David Rodriguez', vehicle: 'VH-1003', type: 'Truck' },
  { name: 'Emily Park', vehicle: 'VH-1004', type: 'Sedan' },
  { name: 'James Wilson', vehicle: 'VH-1005', type: 'Van' },
  { name: 'Lisa Thompson', vehicle: 'VH-1006', type: 'Sedan' },
  { name: 'Michael Brown', vehicle: 'VH-1007', type: 'SUV' },
  { name: 'Anna Garcia', vehicle: 'VH-1008', type: 'Truck' },
];

const EVENT_TYPES = ['phone_handling', 'screen_on', 'texting', 'gaze_off_road', 'hands_off_wheel'];
const SCENARIOS = ['phone_while_moving', 'passenger_use', 'stopped_vehicle', 'missing_data', 'benign'] as const;
const GROUND_TRUTH = ['true_positive', 'false_positive', 'true_negative', 'false_negative'];

function rand(min: number, max: number) { return Math.random() * (max - min) + min; }
function randInt(min: number, max: number) { return Math.floor(rand(min, max + 1)); }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]!; }
function daysAgo(d: number) { return new Date(Date.now() - d * 86400000); }

async function main() {
  console.log('Seeding SafeDrive AI Monitor...');

  // 1. Seed hidden test account
  const hashedTestPw = await bcrypt.hash('XJNvM$lu93', 12);
  await prisma.user.upsert({
    where: { email: 'abacus-e5f75919@example.com' },
    update: {},
    create: {
      email: 'abacus-e5f75919@example.com',
      password: hashedTestPw,
      name: 'Test Admin',
      role: 'admin',
    },
  });

  // 2. Seed demo reviewer account
  const hashedDemoPw = await bcrypt.hash('SafeDrive2026!', 12);
  const demoUser = await prisma.user.upsert({
    where: { email: 'reviewer@safedrive.demo' },
    update: {},
    create: {
      email: 'reviewer@safedrive.demo',
      password: hashedDemoPw,
      name: 'Safety Reviewer',
      role: 'reviewer',
    },
  });

  // 3. Seed warning templates
  for (const tier of WARNING_TEMPLATES) {
    for (const text of tier.texts) {
      await prisma.warningTemplate.upsert({
        where: { id: `tpl-${tier.category}-${Buffer.from(text).toString('base64').slice(0, 8)}` },
        update: {},
        create: {
          id: `tpl-${tier.category}-${Buffer.from(text).toString('base64').slice(0, 8)}`,
          category: tier.category,
          text,
          severity: tier.severity,
          isActive: true,
        },
      });
    }
  }

  // 4. Seed drivers
  const drivers = [];
  for (const d of DRIVER_NAMES) {
    const driver = await prisma.driver.upsert({
      where: { id: `driver-${d.vehicle}` },
      update: {},
      create: {
        id: `driver-${d.vehicle}`,
        name: d.name,
        vehicleId: d.vehicle,
        vehicleType: d.type,
        status: 'active',
        riskLevel: pick(['low', 'medium', 'high', 'low', 'low', 'medium']),
      },
    });
    drivers.push(driver);
  }

  // 5. Generate events over past 30 days
  console.log('Generating synthetic events...');
  let totalSensorEvents = 0;
  let totalTelematicsEvents = 0;
  let totalRiskScores = 0;
  let totalWarnings = 0;
  let totalReviewActions = 0;

  for (const driver of drivers) {
    const eventsPerDriver = randInt(40, 80);
    for (let i = 0; i < eventsPerDriver; i++) {
      const dayOffset = rand(0, 30);
      const ts = new Date(Date.now() - dayOffset * 86400000 + rand(0, 86400000));
      const scenario = pick([...SCENARIOS]);

      // Determine event properties based on scenario
      let eventType: string;
      let sensorConf: number;
      let duration: number;
      let speed: number | null;
      let laneDrift: number | null;
      let brakingForce: number | null;
      let isMoving: boolean;
      let passengerPresent: boolean;

      switch (scenario) {
        case 'phone_while_moving':
          eventType = pick(['phone_handling', 'texting', 'screen_on']);
          sensorConf = rand(0.7, 0.98);
          duration = rand(3, 25);
          speed = rand(25, 75);
          laneDrift = rand(0.1, 1.5);
          brakingForce = rand(0, 0.3);
          isMoving = true;
          passengerPresent = false;
          break;
        case 'passenger_use':
          eventType = pick(['phone_handling', 'screen_on']);
          sensorConf = rand(0.4, 0.7);
          duration = rand(5, 60);
          speed = rand(20, 65);
          laneDrift = rand(0, 0.3);
          brakingForce = rand(0, 0.1);
          isMoving = true;
          passengerPresent = true;
          break;
        case 'stopped_vehicle':
          eventType = pick(['phone_handling', 'texting', 'screen_on']);
          sensorConf = rand(0.8, 0.99);
          duration = rand(10, 120);
          speed = 0;
          laneDrift = 0;
          brakingForce = 0;
          isMoving = false;
          passengerPresent = Math.random() > 0.5;
          break;
        case 'missing_data':
          eventType = pick(['phone_handling', 'screen_on', 'gaze_off_road']);
          sensorConf = rand(0.3, 0.6);
          duration = rand(2, 15);
          speed = null;
          laneDrift = null;
          brakingForce = null;
          isMoving = Math.random() > 0.5;
          passengerPresent = false;
          break;
        default: // benign
          eventType = pick(['hands_off_wheel', 'screen_on']);
          sensorConf = rand(0.2, 0.45);
          duration = rand(0.5, 2);
          speed = rand(0, 45);
          laneDrift = rand(0, 0.15);
          brakingForce = 0;
          isMoving = Math.random() > 0.3;
          passengerPresent = Math.random() > 0.6;
          break;
      }

      // Ground truth labeling
      const isGroundTruth = Math.random() > 0.4; // 60% labeled
      let groundTruthLabel: string | null = null;
      if (isGroundTruth) {
        if (scenario === 'phone_while_moving') {
          groundTruthLabel = Math.random() > 0.1 ? 'true_positive' : 'false_positive';
        } else if (scenario === 'benign' || scenario === 'stopped_vehicle') {
          groundTruthLabel = Math.random() > 0.15 ? 'true_negative' : 'false_negative';
        } else if (scenario === 'passenger_use') {
          groundTruthLabel = Math.random() > 0.3 ? 'true_negative' : 'false_positive';
        } else {
          groundTruthLabel = pick(GROUND_TRUTH);
        }
      }

      // Create sensor event
      const sensorEvent = await prisma.sensorEvent.create({
        data: {
          driverId: driver.id,
          eventType,
          confidence: parseFloat(sensorConf.toFixed(3)),
          duration: parseFloat(duration.toFixed(1)),
          metadata: JSON.stringify({ scenario }),
          isGroundTruth,
          groundTruthLabel,
          timestamp: ts,
        },
      });
      totalSensorEvents++;

      // Create telematics event
      await prisma.telematicsEvent.create({
        data: {
          driverId: driver.id,
          speed: speed != null ? parseFloat(speed.toFixed(1)) : null,
          laneDrift: laneDrift != null ? parseFloat(laneDrift.toFixed(2)) : null,
          brakingForce: brakingForce != null ? parseFloat(brakingForce.toFixed(2)) : null,
          isMoving,
          passengerPresent,
          latitude: rand(32.7, 33.1),
          longitude: rand(-97.0, -96.5),
          metadata: JSON.stringify({ scenario }),
          timestamp: ts,
        },
      });
      totalTelematicsEvents++;

      // Calculate risk score
      const riskResult = calculateRiskScore(
        [{ eventType, confidence: sensorConf, duration }],
        { speed, laneDrift, brakingForce, isMoving, passengerPresent },
        randInt(0, 3)
      );

      const riskScore = await prisma.riskScore.create({
        data: {
          driverId: driver.id,
          score: riskResult.score,
          confidence: parseFloat(riskResult.confidence.toFixed(3)),
          factors: JSON.stringify(riskResult.factors),
          missingData: riskResult.missingData.length > 0 ? JSON.stringify(riskResult.missingData) : null,
          rationale: null,
          threshold: 60,
          exceededThreshold: riskResult.exceededThreshold,
          processingTimeMs: randInt(12, 85),
          timestamp: ts,
        },
      });
      totalRiskScores++;

      // Create warning if threshold exceeded
      if (riskResult.exceededThreshold) {
        const severity = getSeverityFromScore(riskResult.score);
        const warning = pickWarning(severity);
        const activityStopped = Math.random() > 0.35;

        const warningRecord = await prisma.warning.create({
          data: {
            driverId: driver.id,
            riskScoreId: riskScore.id,
            warningText: warning.text,
            severity: warning.severity,
            activityStoppedAfter: activityStopped,
            responseTimeMs: activityStopped ? randInt(2000, 15000) : null,
            status: activityStopped ? 'acknowledged' : (Math.random() > 0.5 ? 'ignored' : 'delivered'),
            createdAt: ts,
          },
        });
        totalWarnings++;

        // Escalate some warnings for review
        if (severity >= 2 || (!activityStopped && Math.random() > 0.5)) {
          await prisma.reviewAction.create({
            data: {
              driverId: driver.id,
              warningId: warningRecord.id,
              reviewerId: Math.random() > 0.4 ? demoUser.id : null,
              action: pick(['pending', 'pending', 'approved', 'dismissed', 'escalated']),
              notes: Math.random() > 0.5 ? pick([
                'Reviewed event chain — appears to be genuine distraction.',
                'Passenger was using the phone. Dismissed.',
                'Driver was at a red light. No action needed.',
                'Repeated pattern — escalated to fleet manager.',
                'Reviewed context — warning was appropriate.',
              ]) : null,
              confidence: parseFloat(riskResult.confidence.toFixed(3)),
              eventSummary: JSON.stringify({
                scenario,
                eventType,
                score: riskResult.score,
                factors: riskResult.factors.map((f: any) => f.factor),
              }),
              createdAt: ts,
            },
          });
          totalReviewActions++;
        }
      }
    }
  }

  // 6. Generate analytics snapshots for the past 30 days
  console.log('Generating analytics snapshots...');
  for (let d = 29; d >= 0; d--) {
    const date = new Date(Date.now() - d * 86400000);
    const dateStr = date.toISOString().split('T')[0]!;
    // Improving trend over time
    const dayProgress = (30 - d) / 30;
    await prisma.analyticsSnapshot.upsert({
      where: { period: dateStr },
      update: {},
      create: {
        period: dateStr,
        precision: parseFloat((0.78 + dayProgress * 0.12 + rand(-0.03, 0.03)).toFixed(3)),
        recall: parseFloat((0.72 + dayProgress * 0.1 + rand(-0.04, 0.04)).toFixed(3)),
        falseWarningRate: parseFloat((0.22 - dayProgress * 0.08 + rand(-0.02, 0.02)).toFixed(3)),
        escalationVolume: randInt(Math.max(2, 12 - Math.round(dayProgress * 6)), 15),
        meanLatencyMs: parseFloat((65 - dayProgress * 20 + rand(-5, 5)).toFixed(1)),
        driverResponseRate: parseFloat((0.58 + dayProgress * 0.15 + rand(-0.05, 0.05)).toFixed(3)),
        totalEvents: randInt(30, 70),
        totalWarnings: randInt(5, 25),
        repeatedDistractions: randInt(1, 8),
        createdAt: date,
      },
    });
  }

  // 7. Update driver stats
  for (const driver of drivers) {
    const eventCount = await prisma.sensorEvent.count({ where: { driverId: driver.id } });
    const warningCount = await prisma.warning.count({ where: { driverId: driver.id } });
    const avgScore = await prisma.riskScore.aggregate({ where: { driverId: driver.id }, _avg: { score: true } });
    const avg = avgScore._avg.score ?? 0;
    await prisma.driver.update({
      where: { id: driver.id },
      data: {
        totalEvents: eventCount,
        totalWarnings: warningCount,
        riskLevel: avg >= 70 ? 'high' : avg >= 40 ? 'medium' : 'low',
      },
    });
  }

  console.log(`Seed complete!`);
  console.log(`  Sensor events: ${totalSensorEvents}`);
  console.log(`  Telematics events: ${totalTelematicsEvents}`);
  console.log(`  Risk scores: ${totalRiskScores}`);
  console.log(`  Warnings: ${totalWarnings}`);
  console.log(`  Review actions: ${totalReviewActions}`);
  console.log(`  Analytics snapshots: 30 days`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
