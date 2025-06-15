/**
 * Motor Profile System for DYNAMIXEL devices
 * Provides predefined configurations for different motor models and use cases
 * Inspired by DynaNode's MotorProfile architecture
 */

export class MotorProfiles {
    constructor() {
        this.profiles = new Map();
        this.customProfiles = new Map();
        this.initializeDefaultProfiles();
    }

    initializeDefaultProfiles() {
        // AX Series Profiles
        this.profiles.set('AX-12A', {
            modelNumber: 12,
            series: 'AX',
            specs: {
                stallTorque: 1.5, // kg·cm
                maxSpeed: 59, // RPM
                operatingVoltage: [9.0, 12.0], // V
                resolution: 1024,
                positionRange: [0, 1023],
                temperatureRange: [-5, 70], // Celsius
                weight: 54.6, // grams
                dimensions: [32, 50, 40] // mm [width, depth, height]
            },
            defaultSettings: {
                torqueEnable: 1,
                goalPosition: 512,
                movingSpeed: 32,
                torqueLimit: 1023,
                alarmLED: 36,
                alarmShutdown: 36,
                returnDelay: 250,
                statusReturnLevel: 2
            },
            operatingModes: ['joint', 'wheel'],
            recommendedProfiles: {
                precision: {
                    movingSpeed: 10,
                    torqueLimit: 512,
                    description: 'High precision, low speed positioning'
                },
                balanced: {
                    movingSpeed: 32,
                    torqueLimit: 1023,
                    description: 'Balanced speed and torque'
                },
                fast: {
                    movingSpeed: 100,
                    torqueLimit: 1023,
                    description: 'Fast positioning with full torque'
                }
            }
        });

        this.profiles.set('MX-28', {
            modelNumber: 29,
            series: 'MX',
            specs: {
                stallTorque: 2.5, // kg·cm
                maxSpeed: 55, // RPM
                operatingVoltage: [10.0, 14.8], // V
                resolution: 4096,
                positionRange: [0, 4095],
                temperatureRange: [-5, 80], // Celsius
                weight: 77, // grams
                dimensions: [35.6, 50.6, 35.5] // mm
            },
            defaultSettings: {
                torqueEnable: 1,
                goalPosition: 2048,
                goalVelocity: 50,
                goalPWM: 885,
                operatingMode: 3, // Position control
                returnDelay: 250,
                statusReturnLevel: 2
            },
            operatingModes: ['current', 'velocity', 'position', 'extended_position', 'current_position', 'pwm'],
            recommendedProfiles: {
                servo: {
                    operatingMode: 3, // Position control
                    goalVelocity: 30,
                    description: 'Standard servo operation'
                },
                wheel: {
                    operatingMode: 1, // Velocity control
                    goalVelocity: 50,
                    description: 'Continuous rotation wheel mode'
                },
                compliant: {
                    operatingMode: 0, // Current control
                    goalCurrent: 100,
                    description: 'Force-controlled compliant operation'
                }
            }
        });

        this.profiles.set('XM430-W350', {
            modelNumber: 1030,
            series: 'X',
            specs: {
                stallTorque: 4.1, // kg·cm
                maxSpeed: 46, // RPM
                operatingVoltage: [10.0, 14.8], // V
                resolution: 4096,
                positionRange: [0, 4095],
                temperatureRange: [-5, 80], // Celsius
                weight: 82, // grams
                dimensions: [28.5, 46.5, 34] // mm
            },
            defaultSettings: {
                torqueEnable: 1,
                goalPosition: 2048,
                goalVelocity: 50,
                goalCurrent: 200,
                operatingMode: 3, // Position control
                returnDelay: 250,
                statusReturnLevel: 2,
                velocityLimit: 480,
                accelerationLimit: 32767
            },
            operatingModes: ['current', 'velocity', 'position', 'extended_position', 'current_position', 'pwm'],
            recommendedProfiles: {
                precision: {
                    operatingMode: 3,
                    goalVelocity: 20,
                    accelerationLimit: 1000,
                    description: 'High precision positioning'
                },
                dynamic: {
                    operatingMode: 3,
                    goalVelocity: 100,
                    accelerationLimit: 10000,
                    description: 'Dynamic positioning with smooth acceleration'
                },
                force_control: {
                    operatingMode: 0,
                    goalCurrent: 150,
                    description: 'Force-controlled operation'
                }
            }
        });

        // Add more motor profiles...
        this.addRobotArmProfile();
        this.addWheelRobotProfile();
        this.addGripperProfile();
    }

    addRobotArmProfile() {
        this.profiles.set('ROBOT_ARM_6DOF', {
            type: 'application_profile',
            description: '6DOF Robot Arm Configuration',
            joints: {
                base: {
                    motorModel: 'XM430-W350',
                    settings: {
                        operatingMode: 3,
                        goalVelocity: 30,
                        accelerationLimit: 2000,
                        positionPGain: 800,
                        positionIGain: 0,
                        positionDGain: 0
                    },
                    limits: {
                        minPosition: 0,
                        maxPosition: 4095,
                        maxVelocity: 100
                    }
                },
                shoulder: {
                    motorModel: 'XM430-W350',
                    settings: {
                        operatingMode: 3,
                        goalVelocity: 40,
                        accelerationLimit: 3000,
                        positionPGain: 900
                    }
                },
                elbow: {
                    motorModel: 'MX-28',
                    settings: {
                        operatingMode: 3,
                        goalVelocity: 50,
                        accelerationLimit: 4000
                    }
                },
                wrist1: { motorModel: 'AX-12A', settings: { movingSpeed: 50 } },
                wrist2: { motorModel: 'AX-12A', settings: { movingSpeed: 50 } },
                wrist3: { motorModel: 'AX-12A', settings: { movingSpeed: 30 } }
            }
        });
    }

    addWheelRobotProfile() {
        this.profiles.set('MOBILE_ROBOT_4WD', {
            type: 'application_profile',
            description: '4-Wheel Drive Mobile Robot',
            wheels: {
                frontLeft: {
                    motorModel: 'XM430-W350',
                    settings: {
                        operatingMode: 1, // Velocity control
                        goalVelocity: 0,
                        accelerationLimit: 5000
                    }
                },
                frontRight: {
                    motorModel: 'XM430-W350',
                    settings: {
                        operatingMode: 1,
                        goalVelocity: 0,
                        accelerationLimit: 5000
                    }
                },
                backLeft: {
                    motorModel: 'XM430-W350',
                    settings: {
                        operatingMode: 1,
                        goalVelocity: 0,
                        accelerationLimit: 5000
                    }
                },
                backRight: {
                    motorModel: 'XM430-W350',
                    settings: {
                        operatingMode: 1,
                        goalVelocity: 0,
                        accelerationLimit: 5000
                    }
                }
            },
            kinematics: {
                wheelbase: 200, // mm
                trackWidth: 150, // mm
                wheelRadius: 30 // mm
            }
        });
    }

    addGripperProfile() {
        this.profiles.set('ADAPTIVE_GRIPPER', {
            type: 'application_profile',
            description: 'Adaptive Gripper with Force Control',
            fingers: {
                finger1: {
                    motorModel: 'MX-28',
                    settings: {
                        operatingMode: 0, // Current control
                        goalCurrent: 100,
                        currentLimit: 200
                    }
                },
                finger2: {
                    motorModel: 'MX-28',
                    settings: {
                        operatingMode: 0,
                        goalCurrent: 100,
                        currentLimit: 200
                    }
                }
            },
            graspingModes: {
                gentle: { goalCurrent: 50, description: 'Gentle grasp for delicate objects' },
                firm: { goalCurrent: 150, description: 'Firm grasp for secure holding' },
                maximum: { goalCurrent: 200, description: 'Maximum force grasp' }
            }
        });
    }

    /**
     * Get profile for a motor model
     */
    getProfile(modelName) {
        return this.profiles.get(modelName) || this.customProfiles.get(modelName);
    }

    /**
     * Get recommended settings for a motor model and use case
     */
    getRecommendedSettings(modelName, useCase = 'balanced') {
        const profile = this.getProfile(modelName);
        if (!profile) return null;

        const baseSettings = { ...profile.defaultSettings };
        const recommendedProfile = profile.recommendedProfiles?.[useCase];

        if (recommendedProfile) {
            return { ...baseSettings, ...recommendedProfile };
        }

        return baseSettings;
    }

    /**
     * Create a custom profile
     */
    createCustomProfile(name, profileData) {
        this.customProfiles.set(name, {
            ...profileData,
            custom: true,
            createdAt: Date.now()
        });
    }

    /**
     * Get all available profiles
     */
    getAllProfiles() {
        const allProfiles = new Map();

        // Add default profiles
        for (const [name, profile] of this.profiles) {
            allProfiles.set(name, { ...profile, type: profile.type || 'motor_profile' });
        }

        // Add custom profiles
        for (const [name, profile] of this.customProfiles) {
            allProfiles.set(name, { ...profile, type: 'custom_profile' });
        }

        return allProfiles;
    }

    /**
     * Get profiles by motor series
     */
    getProfilesBySeries(series) {
        const profiles = [];
        for (const [name, profile] of this.profiles) {
            if (profile.series === series) {
                profiles.push({ name, ...profile });
            }
        }
        return profiles;
    }

    /**
     * Get application profiles
     */
    getApplicationProfiles() {
        const profiles = [];
        for (const [name, profile] of this.profiles) {
            if (profile.type === 'application_profile') {
                profiles.push({ name, ...profile });
            }
        }
        return profiles;
    }

    /**
     * Validate profile compatibility
     */
    validateProfile(motorModel, profileSettings) {
        const profile = this.getProfile(motorModel);
        if (!profile) return { valid: false, errors: ['Unknown motor model'] };

        const errors = [];
        const specs = profile.specs;

        // Validate position range
        if (profileSettings.goalPosition !== undefined) {
            if (profileSettings.goalPosition < specs.positionRange[0] ||
                profileSettings.goalPosition > specs.positionRange[1]) {
                errors.push(`Goal position ${profileSettings.goalPosition} outside valid range [${specs.positionRange[0]}, ${specs.positionRange[1]}]`);
            }
        }

        // Validate velocity
        if (profileSettings.goalVelocity !== undefined && specs.maxSpeed) {
            const maxVelUnits = this.rpmToVelocityUnits(specs.maxSpeed, profile);
            if (profileSettings.goalVelocity > maxVelUnits) {
                errors.push(`Goal velocity ${profileSettings.goalVelocity} exceeds maximum ${maxVelUnits}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings: []
        };
    }

    /**
     * Convert RPM to velocity units for a specific motor
     */
    rpmToVelocityUnits(rpm, profile) {
        // This varies by motor series - simplified calculation
        const resolution = profile.specs.resolution;
        return Math.round((rpm * resolution) / 60);
    }

    /**
     * Get optimal settings for multi-motor synchronization
     */
    getSynchronizationSettings(motorModels) {
        const profiles = motorModels.map(model => this.getProfile(model)).filter(Boolean);
        if (profiles.length === 0) return null;

        // Find common denominator settings for synchronized operation
        const minMaxSpeed = Math.min(...profiles.map(p => p.specs.maxSpeed));
        const commonReturnDelay = Math.max(...profiles.map(p => p.defaultSettings.returnDelay || 250));

        return {
            recommendedVelocity: Math.round(minMaxSpeed * 0.7), // 70% of slowest motor
            returnDelay: commonReturnDelay,
            statusReturnLevel: 1, // Reduce traffic for sync
            recommendedUpdateRate: Math.max(50, commonReturnDelay * 2) // ms
        };
    }

    /**
     * Export profile as JSON
     */
    exportProfile(profileName) {
        const profile = this.getProfile(profileName);
        return profile ? JSON.stringify(profile, null, 2) : null;
    }

    /**
     * Import profile from JSON
     */
    importProfile(name, jsonData) {
        try {
            const profileData = JSON.parse(jsonData);
            this.createCustomProfile(name, profileData);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}
