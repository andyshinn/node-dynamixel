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

    // XC330-M288 Profile - New Addition
    this.profiles.set('XC330-M288', {
      modelNumber: 1300,
      series: 'XC',
      specs: {
        stallTorque: 0.93, // N·m at 5.0V (recommended voltage)
        maxSpeed: 81, // RPM at 5.0V
        operatingVoltage: [3.7, 6.0], // V (recommended 5.0V)
        recommendedVoltage: 5.0, // V
        resolution: 4096,
        positionRange: [0, 4095],
        temperatureRange: [-5, 70], // Celsius
        weight: 23, // grams
        dimensions: [20.0, 34.0, 26.0], // mm [width, height, depth]
        gearRatio: 288.35,
        standbyCurrent: 17, // mA
        maxCurrent: 1800 // mA at 5.0V
      },
      defaultSettings: {
        id: 1,
        baudRate: 1, // 57600 bps (factory default)
        returnDelayTime: 250, // 0.5ms
        driveMode: 0,
        operatingMode: 3, // Position Control Mode
        homingOffset: 0,
        movingThreshold: 10,
        temperatureLimit: 70,
        maxVoltageLimit: 70, // 7.0V
        minVoltageLimit: 35, // 3.5V
        pwmLimit: 885, // 100%
        currentLimit: 2352, // 2.352A
        velocityLimit: 350, // 0.229 rev/min units
        maxPositionLimit: 4095,
        minPositionLimit: 0,
        torqueEnable: 0,
        led: 0,
        statusReturnLevel: 2,
        velocityIGain: 1600,
        velocityPGain: 50,
        positionDGain: 500,
        positionIGain: 0,
        positionPGain: 1100,
        feedforward2ndGain: 0,
        feedforward1stGain: 0,
        goalPosition: 2048,
        profileAcceleration: 0,
        profileVelocity: 0
      },
      operatingModes: [
        'current', // 0 - Current Control Mode
        'velocity', // 1 - Velocity Control Mode
        'position', // 3 - Position Control Mode (default)
        'extended_position', // 4 - Extended Position Control Mode
        'current_position', // 5 - Current-based Position Control Mode
        'pwm' // 16 - PWM Control Mode
      ],
      controlTable: {
        // EEPROM Area
        modelNumber: { address: 0, size: 2, access: 'R', initialValue: 1300 },
        modelInformation: { address: 2, size: 4, access: 'R' },
        firmwareVersion: { address: 6, size: 1, access: 'R' },
        id: { address: 7, size: 1, access: 'RW', initialValue: 1, range: [0, 252] },
        baudRate: { address: 8, size: 1, access: 'RW', initialValue: 1, range: [0, 6] },
        returnDelayTime: { address: 9, size: 1, access: 'RW', initialValue: 250, range: [0, 254] },
        driveMode: { address: 10, size: 1, access: 'RW', initialValue: 0, range: [0, 13] },
        operatingMode: { address: 11, size: 1, access: 'RW', initialValue: 3, range: [0, 16] },
        secondaryId: { address: 12, size: 1, access: 'RW', initialValue: 255, range: [0, 252] },
        protocolType: { address: 13, size: 1, access: 'RW', initialValue: 2, range: [2, 22] },
        homingOffset: { address: 20, size: 4, access: 'RW', initialValue: 0, range: [-1044479, 1044479] },
        movingThreshold: { address: 24, size: 4, access: 'RW', initialValue: 10, range: [0, 1023] },
        temperatureLimit: { address: 31, size: 1, access: 'RW', initialValue: 70, range: [0, 100] },
        maxVoltageLimit: { address: 32, size: 2, access: 'RW', initialValue: 70, range: [31, 70] },
        minVoltageLimit: { address: 34, size: 2, access: 'RW', initialValue: 35, range: [31, 70] },
        pwmLimit: { address: 36, size: 2, access: 'RW', initialValue: 885, range: [0, 885] },
        currentLimit: { address: 38, size: 2, access: 'RW', initialValue: 2352, range: [0, 2352] },
        velocityLimit: { address: 44, size: 4, access: 'RW', initialValue: 350, range: [0, 2047] },
        maxPositionLimit: { address: 48, size: 4, access: 'RW', initialValue: 4095, range: [0, 4095] },
        minPositionLimit: { address: 52, size: 4, access: 'RW', initialValue: 0, range: [0, 4095] },
        startupConfiguration: { address: 60, size: 1, access: 'RW', initialValue: 0, range: [0, 3] },
        pwmSlope: { address: 62, size: 1, access: 'RW', initialValue: 140, range: [1, 255] },
        shutdown: { address: 63, size: 1, access: 'RW', initialValue: 52 },

        // RAM Area
        torqueEnable: { address: 64, size: 1, access: 'RW', initialValue: 0, range: [0, 1] },
        led: { address: 65, size: 1, access: 'RW', initialValue: 0, range: [0, 1] },
        statusReturnLevel: { address: 68, size: 1, access: 'RW', initialValue: 2, range: [0, 2] },
        registeredInstruction: { address: 69, size: 1, access: 'R', initialValue: 0, range: [0, 1] },
        hardwareErrorStatus: { address: 70, size: 1, access: 'R', initialValue: 0 },
        velocityIGain: { address: 76, size: 2, access: 'RW', initialValue: 1600, range: [0, 16383] },
        velocityPGain: { address: 78, size: 2, access: 'RW', initialValue: 50, range: [0, 16383] },
        positionDGain: { address: 80, size: 2, access: 'RW', initialValue: 500, range: [0, 16383] },
        positionIGain: { address: 82, size: 2, access: 'RW', initialValue: 0, range: [0, 16383] },
        positionPGain: { address: 84, size: 2, access: 'RW', initialValue: 1100, range: [0, 16383] },
        feedforward2ndGain: { address: 88, size: 2, access: 'RW', initialValue: 0, range: [0, 16383] },
        feedforward1stGain: { address: 90, size: 2, access: 'RW', initialValue: 0, range: [0, 16383] },
        busWatchdog: { address: 98, size: 1, access: 'RW', initialValue: 0, range: [1, 127] },
        goalPWM: { address: 100, size: 2, access: 'RW' },
        goalCurrent: { address: 102, size: 2, access: 'RW' },
        goalVelocity: { address: 104, size: 4, access: 'RW' },
        profileAcceleration: { address: 108, size: 4, access: 'RW', initialValue: 0, range: [0, 32767] },
        profileVelocity: { address: 112, size: 4, access: 'RW', initialValue: 0, range: [0, 32767] },
        goalPosition: { address: 116, size: 4, access: 'RW' },
        realtimeTick: { address: 120, size: 2, access: 'R', range: [0, 32767] },
        moving: { address: 122, size: 1, access: 'R', initialValue: 0, range: [0, 1] },
        movingStatus: { address: 123, size: 1, access: 'R', initialValue: 0 },
        presentPWM: { address: 124, size: 2, access: 'R' },
        presentCurrent: { address: 126, size: 2, access: 'R' },
        presentVelocity: { address: 128, size: 4, access: 'R' },
        presentPosition: { address: 132, size: 4, access: 'R' },
        velocityTrajectory: { address: 136, size: 4, access: 'R' },
        positionTrajectory: { address: 140, size: 4, access: 'R' },
        presentInputVoltage: { address: 144, size: 2, access: 'R' },
        presentTemperature: { address: 146, size: 1, access: 'R' },
        backupReady: { address: 147, size: 1, access: 'R', range: [0, 1] }
      },
      recommendedProfiles: {
        precision: {
          operatingMode: 3, // Position control
          goalVelocity: 15, // Slow speed for precision
          profileAcceleration: 500,
          profileVelocity: 30,
          positionPGain: 1500, // Higher P gain for precision
          positionIGain: 50,
          positionDGain: 800,
          description: 'High precision positioning with increased gains'
        },
        balanced: {
          operatingMode: 3, // Position control
          goalVelocity: 40, // Moderate speed
          profileAcceleration: 1000,
          profileVelocity: 80,
          positionPGain: 1100, // Default gains
          positionIGain: 0,
          positionDGain: 500,
          description: 'Balanced speed and precision'
        },
        fast: {
          operatingMode: 3, // Position control
          goalVelocity: 80, // Fast movement
          profileAcceleration: 2000,
          profileVelocity: 150,
          positionPGain: 800, // Lower P gain to reduce oscillation
          positionIGain: 0,
          positionDGain: 300,
          description: 'Fast positioning with smooth movement'
        },
        wheel: {
          operatingMode: 1, // Velocity control
          goalVelocity: 50,
          profileAcceleration: 1500,
          velocityPGain: 60,
          velocityIGain: 2000,
          description: 'Continuous rotation for wheel applications'
        },
        compliant: {
          operatingMode: 0, // Current control
          goalCurrent: 300, // Low torque for compliance
          currentLimit: 800,
          description: 'Force-controlled compliant operation'
        },
        micro_servo: {
          operatingMode: 3, // Position control
          goalVelocity: 20,
          profileAcceleration: 300,
          profileVelocity: 40,
          positionPGain: 2000, // Very high precision for micro movements
          positionIGain: 100,
          positionDGain: 1000,
          description: 'Micro servo operation for small, precise movements'
        }
      },
      conversions: {
        position: {
          unit: 'pulse',
          resolution: 4096,
          range: [0, 4095],
          degreesPerUnit: 0.088 // 360° / 4096 steps
        },
        velocity: {
          unit: 'rev/min',
          scale: 0.229 // RPM per unit
        },
        current: {
          unit: 'mA',
          scale: 1.0 // 1 unit = 1 mA
        },
        voltage: {
          unit: 'V',
          scale: 0.1 // 1 unit = 0.1V
        },
        temperature: {
          unit: '°C',
          scale: 1.0 // 1 unit = 1°C
        },
        pwm: {
          unit: '%',
          scale: 0.113 // 1 unit = 0.113%
        }
      },
      features: {
        rcProtocols: ['SBUS', 'iBUS', 'RC-PWM'],
        metalGears: true,
        bearing: true,
        contactlessEncoder: true,
        energySaving: true,
        profileControl: true,
        multiTurn: true // Extended position control mode
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

  /**
   * Get model number for a motor model name
   */
  getModelNumber(modelName) {
    const profile = this.getProfile(modelName);
    return profile?.modelNumber || null;
  }

  /**
   * Find motor model by model number
   */
  getModelByNumber(modelNumber) {
    for (const [name, profile] of this.profiles) {
      if (profile.modelNumber === modelNumber) {
        return name;
      }
    }
    return null;
  }

  /**
   * Get operating modes for a motor model
   */
  getOperatingModes(modelName) {
    const profile = this.getProfile(modelName);
    return profile?.operatingModes || [];
  }

  /**
   * Get operating mode constants for a motor model
   */
  getOperatingModeConstants(modelName) {
    const profile = this.getProfile(modelName);
    if (!profile?.operatingModes) return {};

    const constants = {};
    profile.operatingModes.forEach((mode, index) => {
      // Convert mode names to constants format
      const constantName = mode.toUpperCase().replace(/-/g, '_') + '_CONTROL';

      // Map to actual operating mode values based on DYNAMIXEL protocol
      switch (mode) {
        case 'current':
          constants[constantName] = 0;
          break;
        case 'velocity':
          constants[constantName] = 1;
          break;
        case 'position':
          constants[constantName] = 3;
          break;
        case 'extended_position':
          constants[constantName] = 4;
          break;
        case 'current_position':
          constants[constantName] = 5;
          break;
        case 'pwm':
          constants[constantName] = 16;
          break;
        default:
          constants[constantName] = index;
      }
    });

    return constants;
  }

  /**
   * Get default settings for a motor model
   */
  getDefaultSettings(modelName) {
    const profile = this.getProfile(modelName);
    return profile?.defaultSettings ? { ...profile.defaultSettings } : null;
  }

  /**
   * Get specifications for a motor model
   */
  getSpecs(modelName) {
    const profile = this.getProfile(modelName);
    return profile?.specs ? { ...profile.specs } : null;
  }

  /**
   * Get control table information for a motor model
   */
  getControlTable(modelName) {
    const profile = this.getProfile(modelName);
    return profile?.controlTable ? { ...profile.controlTable } : null;
  }

  /**
   * Get control table address for a specific register
   */
  getControlTableAddress(modelName, registerName) {
    const profile = this.getProfile(modelName);
    const ctEntry = profile?.controlTable?.[registerName];
    return ctEntry?.address;
  }

  /**
   * Get conversion factors for a motor model
   */
  getConversions(modelName) {
    const profile = this.getProfile(modelName);
    return profile?.conversions ? { ...profile.conversions } : null;
  }

  /**
   * Check if a motor model supports a feature
   */
  hasFeature(modelName, featureName) {
    const profile = this.getProfile(modelName);
    return profile?.features?.[featureName] === true;
  }

  /**
   * Get all model numbers as a lookup map (replaces MODEL_NUMBERS from constants)
   */
  getModelNumbers() {
    const modelNumbers = {};
    for (const [name, profile] of this.profiles) {
      if (profile.modelNumber && profile.type !== 'application_profile') {
        // Convert model name to constant format (e.g., 'XC330-M288' -> 'XC330_M288')
        const constantName = name.replace(/-/g, '_').toUpperCase();
        modelNumbers[constantName] = profile.modelNumber;
      }
    }
    return modelNumbers;
  }
}
