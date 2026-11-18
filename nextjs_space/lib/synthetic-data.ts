/**
 * Synthetic data generator for the SafeDrive AI Monitor.
 * Produces realistic sensor + telematics events across five scenarios:
 *   1. Phone use while moving (high risk)
 *   2. Passenger use (low risk — passenger has the phone)
 *   3. Stopped vehicle (low risk)
 *   4. Missing data (uncertain)
 *   5. Benign events (normal driving)
 */

import { calculateRiskScore, type SensorInput, type TelematicsInput } from './risk-scoring';
import { getSeverityFromScore, pickWarning } from './warning-templates';

const EVENT_TYPES = ['phone_handling', 'screen_on', 'texting', 'gaze_off_road', 'hands_off_wheel'] as const;

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function randInt(min: number, max: number) {
  return Math.floor(rand(min, max + 1));
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * (arr?.length ?? 1))] ?? arr[0]!;
}

export type Scenario = 'phone_while_moving' | 'passenger_use' | 'stopped_vehicle' | 'missing_data' | 'benign';

interface GeneratedEvent {
  scenario: Scenario;
  sensor: SensorInput;
  telematics: TelematicsInput;
}

export function generateEvent(scenario?: Scenario): GeneratedEvent {
  const sc = scenario ?? pick(['phone_while_moving', 'passenger_use', 'stopped_vehicle', 'missing_data', 'benign'] as Scenario[]);

  switch (sc) {
    case 'phone_while_moving':
      return {
        scenario: sc,
        sensor: {
          eventType: pick(['phone_handling', 'texting', 'screen_on']),
          confidence: rand(0.7, 0.98),
          duration: rand(3, 25),
        },
        telematics: {
          speed: rand(25, 75),
          laneDrift: rand(0.1, 1.5),
          brakingForce: rand(0, 0.3),
          isMoving: true,
          passengerPresent: false,
        },
      };
    case 'passenger_use':
      return {
        scenario: sc,
        sensor: {
          eventType: pick(['phone_handling', 'screen_on']),
          confidence: rand(0.4, 0.7),
          duration: rand(5, 60),
        },
        telematics: {
          speed: rand(20, 65),
          laneDrift: rand(0, 0.3),
          brakingForce: rand(0, 0.1),
          isMoving: true,
          passengerPresent: true,
        },
      };
    case 'stopped_vehicle':
      return {
        scenario: sc,
        sensor: {
          eventType: pick(['phone_handling', 'texting', 'screen_on']),
          confidence: rand(0.8, 0.99),
          duration: rand(10, 120),
        },
        telematics: {
          speed: 0,
          laneDrift: 0,
          brakingForce: 0,
          isMoving: false,
          passengerPresent: Math.random() > 0.5,
        },
      };
    case 'missing_data':
      return {
        scenario: sc,
        sensor: {
          eventType: pick(['phone_handling', 'screen_on', 'gaze_off_road']),
          confidence: rand(0.3, 0.6),
          duration: rand(2, 15),
        },
        telematics: {
          speed: null,
          laneDrift: null,
          brakingForce: null,
          isMoving: Math.random() > 0.5,
          passengerPresent: false,
        },
      };
    case 'benign':
    default:
      return {
        scenario: 'benign',
        sensor: {
          eventType: pick(['hands_off_wheel', 'screen_on']),
          confidence: rand(0.2, 0.45),
          duration: rand(0.5, 2),
        },
        telematics: {
          speed: rand(0, 45),
          laneDrift: rand(0, 0.15),
          brakingForce: 0,
          isMoving: Math.random() > 0.3,
          passengerPresent: Math.random() > 0.6,
        },
      };
  }
}

/** Generate a scored event with risk calculation */
export function generateScoredEvent(scenario?: Scenario, recentCount: number = 0) {
  const event = generateEvent(scenario);
  const result = calculateRiskScore([event.sensor], event.telematics, recentCount);
  const severity = getSeverityFromScore(result.score);
  const warning = result.exceededThreshold ? pickWarning(severity) : null;
  return { ...event, risk: result, warning };
}
