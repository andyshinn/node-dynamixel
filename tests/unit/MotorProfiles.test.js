import { jest } from '@jest/globals';
import { MotorProfiles } from '../../src/dynamixel/MotorProfiles.js';

describe('MotorProfiles', () => {
    let motorProfiles;

    beforeEach(() => {
        motorProfiles = new MotorProfiles();
    });

    describe('Constructor', () => {
        test('should initialize with default profiles', () => {
            expect(motorProfiles.profiles.size).toBeGreaterThan(0);
            expect(motorProfiles.customProfiles.size).toBe(0);
        });

        test('should have predefined motor profiles', () => {
            expect(motorProfiles.profiles.has('AX-12A')).toBe(true);
            expect(motorProfiles.profiles.has('MX-28')).toBe(true);
            expect(motorProfiles.profiles.has('XM430-W350')).toBe(true);
        });

        test('should have application profiles', () => {
            expect(motorProfiles.profiles.has('ROBOT_ARM_6DOF')).toBe(true);
            expect(motorProfiles.profiles.has('MOBILE_ROBOT_4WD')).toBe(true);
            expect(motorProfiles.profiles.has('ADAPTIVE_GRIPPER')).toBe(true);
        });
    });

    describe('Motor Profile Structure', () => {
        test('should have correct AX-12A profile structure', () => {
            const profile = motorProfiles.getProfile('AX-12A');

            expect(profile).toMatchObject({
                modelNumber: 12,
                series: 'AX',
                specs: {
                    stallTorque: 1.5,
                    maxSpeed: 59,
                    operatingVoltage: [9.0, 12.0],
                    resolution: 1024,
                    positionRange: [0, 1023],
                    temperatureRange: [-5, 70]
                },
                defaultSettings: expect.any(Object),
                operatingModes: expect.any(Array),
                recommendedProfiles: expect.any(Object)
            });
        });

        test('should have correct XM430-W350 profile structure', () => {
            const profile = motorProfiles.getProfile('XM430-W350');

            expect(profile).toMatchObject({
                modelNumber: 1030,
                series: 'X',
                specs: {
                    stallTorque: 4.1,
                    maxSpeed: 46,
                    operatingVoltage: [10.0, 14.8],
                    resolution: 4096,
                    positionRange: [0, 4095]
                },
                defaultSettings: expect.objectContaining({
                    torqueEnable: 1,
                    goalPosition: 2048,
                    operatingMode: 3
                }),
                operatingModes: expect.arrayContaining(['current', 'velocity', 'position']),
                recommendedProfiles: expect.objectContaining({
                    precision: expect.any(Object),
                    dynamic: expect.any(Object),
                    force_control: expect.any(Object)
                })
            });
        });
    });

    describe('Profile Retrieval', () => {
        test('should get existing profile', () => {
            const profile = motorProfiles.getProfile('MX-28');
            expect(profile).toBeDefined();
            expect(profile.series).toBe('MX');
            expect(profile.modelNumber).toBe(29);
        });

        test('should return undefined for non-existent profile', () => {
            const profile = motorProfiles.getProfile('NON_EXISTENT');
            expect(profile).toBeUndefined();
        });

        test('should get custom profile', () => {
            const customProfile = {
                modelNumber: 999,
                series: 'CUSTOM',
                specs: { stallTorque: 10.0 }
            };

            motorProfiles.createCustomProfile('CUSTOM_MOTOR', customProfile);
            const retrieved = motorProfiles.getProfile('CUSTOM_MOTOR');

            expect(retrieved).toMatchObject(customProfile);
            expect(retrieved.custom).toBe(true);
        });
    });

    describe('Recommended Settings', () => {
        test('should get recommended settings for existing profile', () => {
            const settings = motorProfiles.getRecommendedSettings('XM430-W350', 'precision');

            expect(settings).toMatchObject({
                torqueEnable: 1,
                goalPosition: 2048,
                goalVelocity: 20,
                accelerationLimit: 1000,
                operatingMode: 3
            });
        });

        test('should get default settings when use case not found', () => {
            const settings = motorProfiles.getRecommendedSettings('XM430-W350', 'non_existent');

            expect(settings).toMatchObject({
                torqueEnable: 1,
                goalPosition: 2048,
                operatingMode: 3
            });
        });

        test('should return null for non-existent motor', () => {
            const settings = motorProfiles.getRecommendedSettings('NON_EXISTENT', 'precision');
            expect(settings).toBeNull();
        });

        test('should use balanced as default use case', () => {
            const balancedSettings = motorProfiles.getRecommendedSettings('AX-12A', 'balanced');
            const defaultSettings = motorProfiles.getRecommendedSettings('AX-12A');

            expect(defaultSettings).toEqual(balancedSettings);
        });
    });

    describe('Custom Profiles', () => {
        test('should create custom profile', () => {
            const customData = {
                modelNumber: 888,
                series: 'TEST',
                specs: { stallTorque: 5.0, maxSpeed: 100 },
                defaultSettings: { torqueEnable: 1 }
            };

            motorProfiles.createCustomProfile('TEST_MOTOR', customData);

            const profile = motorProfiles.getProfile('TEST_MOTOR');
            expect(profile).toMatchObject(customData);
            expect(profile.custom).toBe(true);
            expect(typeof profile.createdAt).toBe('number');
        });

        test('should overwrite existing custom profile', () => {
            const profile1 = { modelNumber: 100, series: 'V1' };
            const profile2 = { modelNumber: 200, series: 'V2' };

            motorProfiles.createCustomProfile('TEST', profile1);
            motorProfiles.createCustomProfile('TEST', profile2);

            const retrieved = motorProfiles.getProfile('TEST');
            expect(retrieved.modelNumber).toBe(200);
            expect(retrieved.series).toBe('V2');
        });
    });

    describe('Profile Listing', () => {
        test('should get all profiles', () => {
            motorProfiles.createCustomProfile('CUSTOM1', { modelNumber: 1 });
            motorProfiles.createCustomProfile('CUSTOM2', { modelNumber: 2 });

            const allProfiles = motorProfiles.getAllProfiles();

            expect(allProfiles.size).toBeGreaterThan(5); // Default + custom profiles
            expect(allProfiles.has('AX-12A')).toBe(true);
            expect(allProfiles.has('CUSTOM1')).toBe(true);
            expect(allProfiles.get('CUSTOM1').type).toBe('custom_profile');
        });

        test('should get profiles by series', () => {
            const xSeriesProfiles = motorProfiles.getProfilesBySeries('X');

            expect(xSeriesProfiles.length).toBeGreaterThan(0);
            xSeriesProfiles.forEach(profile => {
                expect(profile.series).toBe('X');
                expect(profile.name).toBeDefined();
            });
        });

        test('should get application profiles', () => {
            const appProfiles = motorProfiles.getApplicationProfiles();

            expect(appProfiles.length).toBeGreaterThan(0);
            appProfiles.forEach(profile => {
                expect(profile.type).toBe('application_profile');
                expect(profile.description).toBeDefined();
            });

            const armProfile = appProfiles.find(p => p.name === 'ROBOT_ARM_6DOF');
            expect(armProfile).toBeDefined();
            expect(armProfile.joints).toBeDefined();
        });
    });

    describe('Profile Validation', () => {
        test('should validate valid profile settings', () => {
            const result = motorProfiles.validateProfile('XM430-W350', {
                goalPosition: 2048,
                goalVelocity: 50
            });

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('should detect invalid position range', () => {
            const result = motorProfiles.validateProfile('XM430-W350', {
                goalPosition: 5000 // Outside 0-4095 range
            });

            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain('Goal position 5000 outside valid range');
        });

        test('should detect excessive velocity', () => {
            const result = motorProfiles.validateProfile('AX-12A', {
                goalVelocity: 2000 // Very high velocity
            });

            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain('Goal velocity 2000 exceeds maximum');
        });

        test('should return error for unknown motor model', () => {
            const result = motorProfiles.validateProfile('UNKNOWN_MOTOR', {
                goalPosition: 1000
            });

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Unknown motor model');
        });
    });

    describe('Unit Conversion', () => {
        test('should convert RPM to velocity units', () => {
            const profile = motorProfiles.getProfile('XM430-W350');
            const velocityUnits = motorProfiles.rpmToVelocityUnits(30, profile);

            expect(velocityUnits).toBeGreaterThan(0);
            expect(typeof velocityUnits).toBe('number');
        });

        test('should handle different motor resolutions', () => {
            const axProfile = motorProfiles.getProfile('AX-12A');
            const xmProfile = motorProfiles.getProfile('XM430-W350');

            const axVelocity = motorProfiles.rpmToVelocityUnits(30, axProfile);
            const xmVelocity = motorProfiles.rpmToVelocityUnits(30, xmProfile);

            // XM430 has higher resolution, so should have higher velocity units
            expect(xmVelocity).toBeGreaterThan(axVelocity);
        });
    });

    describe('Synchronization Settings', () => {
        test('should get synchronization settings for multiple motors', () => {
            const syncSettings = motorProfiles.getSynchronizationSettings([
                'XM430-W350', 'MX-28', 'AX-12A'
            ]);

            expect(syncSettings).toMatchObject({
                recommendedVelocity: expect.any(Number),
                returnDelay: expect.any(Number),
                statusReturnLevel: 1,
                recommendedUpdateRate: expect.any(Number)
            });

            // Should be based on slowest motor (AX-12A has lowest max speed)
            expect(syncSettings.recommendedVelocity).toBeLessThan(50);
        });

        test('should handle single motor', () => {
            const syncSettings = motorProfiles.getSynchronizationSettings(['XM430-W350']);

            expect(syncSettings).toBeDefined();
            expect(syncSettings.recommendedVelocity).toBeGreaterThan(0);
        });

        test('should return null for empty motor list', () => {
            const syncSettings = motorProfiles.getSynchronizationSettings([]);
            expect(syncSettings).toBeNull();
        });

        test('should handle unknown motors gracefully', () => {
            const syncSettings = motorProfiles.getSynchronizationSettings([
                'XM430-W350', 'UNKNOWN_MOTOR'
            ]);

            expect(syncSettings).toBeDefined();
            // Should work with just the known motor
        });
    });

    describe('Import/Export', () => {
        test('should export profile as JSON', () => {
            const jsonString = motorProfiles.exportProfile('AX-12A');

            expect(jsonString).toBeDefined();
            const parsed = JSON.parse(jsonString);
            expect(parsed.modelNumber).toBe(12);
            expect(parsed.series).toBe('AX');
        });

        test('should return null for non-existent profile export', () => {
            const result = motorProfiles.exportProfile('NON_EXISTENT');
            expect(result).toBeNull();
        });

        test('should import profile from JSON', () => {
            const profileData = {
                modelNumber: 777,
                series: 'IMPORTED',
                specs: { stallTorque: 3.0 }
            };

            const jsonString = JSON.stringify(profileData);
            const result = motorProfiles.importProfile('IMPORTED_MOTOR', jsonString);

            expect(result.success).toBe(true);

            const imported = motorProfiles.getProfile('IMPORTED_MOTOR');
            expect(imported.modelNumber).toBe(777);
            expect(imported.series).toBe('IMPORTED');
            expect(imported.custom).toBe(true);
        });

        test('should handle invalid JSON import', () => {
            const result = motorProfiles.importProfile('BAD_IMPORT', 'invalid json');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Unexpected token');
        });
    });

    describe('Application Profiles', () => {
        test('should have robot arm profile with correct structure', () => {
            const armProfile = motorProfiles.getProfile('ROBOT_ARM_6DOF');

            expect(armProfile.type).toBe('application_profile');
            expect(armProfile.joints).toBeDefined();
            expect(armProfile.joints.base).toBeDefined();
            expect(armProfile.joints.base.motorModel).toBe('XM430-W350');
            expect(armProfile.joints.base.settings).toMatchObject({
                operatingMode: 3,
                goalVelocity: expect.any(Number)
            });
        });

        test('should have mobile robot profile with kinematics', () => {
            const robotProfile = motorProfiles.getProfile('MOBILE_ROBOT_4WD');

            expect(robotProfile.type).toBe('application_profile');
            expect(robotProfile.wheels).toBeDefined();
            expect(robotProfile.kinematics).toMatchObject({
                wheelbase: expect.any(Number),
                trackWidth: expect.any(Number),
                wheelRadius: expect.any(Number)
            });

            // All wheels should use velocity control
            Object.values(robotProfile.wheels).forEach(wheel => {
                expect(wheel.settings.operatingMode).toBe(1); // Velocity control
            });
        });

        test('should have gripper profile with force control', () => {
            const gripperProfile = motorProfiles.getProfile('ADAPTIVE_GRIPPER');

            expect(gripperProfile.type).toBe('application_profile');
            expect(gripperProfile.fingers).toBeDefined();
            expect(gripperProfile.graspingModes).toBeDefined();

            // Fingers should use current control
            Object.values(gripperProfile.fingers).forEach(finger => {
                expect(finger.settings.operatingMode).toBe(0); // Current control
            });

            expect(gripperProfile.graspingModes.gentle.goalCurrent).toBeLessThan(
                gripperProfile.graspingModes.maximum.goalCurrent
            );
        });
    });

    describe('Profile Recommendations', () => {
        test('should have different settings for different use cases', () => {
            const precisionSettings = motorProfiles.getRecommendedSettings('XM430-W350', 'precision');
            const dynamicSettings = motorProfiles.getRecommendedSettings('XM430-W350', 'dynamic');

            expect(precisionSettings.goalVelocity).toBeLessThan(dynamicSettings.goalVelocity);
            expect(precisionSettings.accelerationLimit).toBeLessThan(dynamicSettings.accelerationLimit);
        });

        test('should have appropriate settings for AX series', () => {
            const settings = motorProfiles.getRecommendedSettings('AX-12A', 'fast');

            expect(settings).toMatchObject({
                movingSpeed: 100,
                torqueLimit: 1023,
                description: expect.stringContaining('Fast')
            });
        });

        test('should have force control settings for MX series', () => {
            const settings = motorProfiles.getRecommendedSettings('MX-28', 'compliant');

            expect(settings).toMatchObject({
                operatingMode: 0, // Current control
                goalCurrent: expect.any(Number),
                description: expect.stringContaining('Force-controlled')
            });
        });
    });
});
