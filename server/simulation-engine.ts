import { MLEnergyEngine, WeatherCondition, OutageResponse } from "./ml-engine";
import { Household, EnergyReading, EnergyTrade } from "../shared/schema";
import { IStorage } from "./storage";

// Separate simulation data context - isolated from real operational data
class SimulationDataContext {
  private households: Household[] = [];
  private energyReadings: EnergyReading[] = [];
  private energyTrades: EnergyTrade[] = [];
  private nextHouseholdId = 1000;
  private nextReadingId = 10000;
  private nextTradeId = 10000;

  // Initialize with demo households for simulation only
  initializeDemoHouseholds(): void {
    const currentHour = new Date().getHours();
    const baseTime = Date.now();

    // Demo household definitions: [name, address, solarCap, batteryCap, batteryLevel, hoursAgo]
    const defs: [string, string, number, number, number, number][] = [
      ["Solar Pioneers (Demo)", "Simulation District A", 5, 15, 15, 24],
      ["Green Energy Hub (Demo)", "Simulation District B", 8, 20, 95, 12],
      ["Community Center (Demo)", "Simulation Commercial Zone", 12, 40, 55, 6],
      ["Eco Apartments (Demo)", "Simulation District C", 3, 10, 25, 18],
      ["Smart Home Alpha (Demo)", "Simulation District A", 6, 18, 80, 3],
      [
        "Tech Innovation Center (Demo)",
        "Simulation Tech District",
        10,
        30,
        40,
        0.5,
      ],
      [
        "Residential Complex Beta (Demo)",
        "Simulation District D",
        4,
        12,
        10,
        2,
      ],
      ["Solar Farm Delta (Demo)", "Simulation Industrial Zone", 15, 50, 70, 8],
    ];

    this.households = defs.map(
      ([
        name,
        address,
        solarCapacity,
        batteryCapacity,
        batteryLevel,
        hoursAgo,
      ]) => {
        const id = this.nextHouseholdId++;
        // Add dynamic battery fluctuation based on time and id
        const variation = Math.sin(((id + currentHour) * Math.PI) / 6) * 15;
        return {
          id,
          name,
          address,
          solarCapacity,
          batteryCapacity,
          currentBatteryLevel: Math.max(
            5,
            Math.min(95, batteryLevel + variation),
          ),
          isOnline: true,
          userId: 999,
          createdAt: new Date(baseTime - hoursAgo * 60 * 60 * 1000),
          coordinates: null,
        } as Household;
      },
    );
  }

  getHouseholds(): Household[] {
    return this.households;
  }

  updateHousehold(id: number, updates: Partial<Household>): void {
    const household = this.households.find((h) => h.id === id);
    if (household) {
      Object.assign(household, updates);
    }
  }

  addEnergyReading(reading: Omit<EnergyReading, "id" | "timestamp">): void {
    this.energyReadings.push({
      id: this.nextReadingId++,
      ...reading,
      timestamp: new Date(),
    });

    // Keep only recent readings to prevent memory bloat
    if (this.energyReadings.length > 1000) {
      this.energyReadings = this.energyReadings.slice(-500);
    }
  }

  addEnergyTrade(
    trade: Omit<EnergyTrade, "id" | "createdAt" | "status" | "completedAt">,
  ): void {
    this.energyTrades.push({
      id: this.nextTradeId++,
      ...trade,
      createdAt: new Date(),
      status: "completed",
      completedAt: new Date(),
    });

    // Keep only recent trades to prevent memory bloat
    if (this.energyTrades.length > 500) {
      this.energyTrades = this.energyTrades.slice(-250);
    }
  }

  getRecentTrades(limit: number = 50): EnergyTrade[] {
    return this.energyTrades.slice(-limit);
  }

  getRecentReadings(limit: number = 100): EnergyReading[] {
    return this.energyReadings.slice(-limit);
  }
}

// Real-time simulation engine for live demonstrations
export class SimulationEngine {
  private mlEngine: MLEnergyEngine;
  private storage: IStorage;
  private simulationData: SimulationDataContext;
  private simulationInterval: NodeJS.Timeout | null = null;
  private weatherSimulator: WeatherSimulator;
  private outageSimulator: OutageSimulator;
  private isRunning: boolean = false;
  private lastOptimizationResult: any = null;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.simulationData = new SimulationDataContext();
    this.mlEngine = new MLEnergyEngine();
    this.weatherSimulator = new WeatherSimulator();
    this.outageSimulator = new OutageSimulator(this.mlEngine);
  }

  // Start live simulation
  async startSimulation(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log("🚀 Starting SolarSense live simulation...");

    // Initialize demo households in isolated simulation context
    this.simulationData.initializeDemoHouseholds();

    // Start main simulation loop
    this.simulationInterval = setInterval(async () => {
      await this.runSimulationCycle();
    }, 10000); // Update every 10 seconds for live demo

    console.log("✅ Live simulation started - updating every 10 seconds");
    console.log(
      `📊 Simulation running with ${this.simulationData.getHouseholds().length} demo households (isolated from real data)`,
    );
  }

  // Stop simulation
  stopSimulation(): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.isRunning = false;
    console.log("⏹️ Simulation stopped");
  }

  // Get simulation status
  getStatus(): SimulationStatus {
    return {
      isRunning: this.isRunning,
      currentWeather: this.weatherSimulator.getCurrentWeather(),
      activeOutages: this.outageSimulator.getActiveOutages(),
      networkStats: this.getNetworkStats(),
    };
  }

  // Trigger weather change for demonstration
  async triggerWeatherChange(
    condition: WeatherCondition["condition"],
  ): Promise<WeatherCondition> {
    const newWeather = this.weatherSimulator.setWeather(condition);
    console.log(
      `🌤️ Simulation weather changed to: ${condition} (isolated from real-time dashboard)`,
    );

    // Immediately run optimization with new weather in simulation context
    await this.runSimulationCycle();

    return newWeather;
  }

  // Trigger power outage simulation
  async triggerOutage(householdIds: number[] = []): Promise<OutageResponse> {
    if (householdIds.length === 0) {
      // Deterministic outage affecting 25% of simulation network
      const allHouseholds = this.simulationData.getHouseholds();
      const outageCount = Math.max(1, Math.floor(allHouseholds.length * 0.25));
      householdIds = this.selectRandomHouseholds(allHouseholds, outageCount);
    }

    const response = await this.outageSimulator.simulateOutage(
      householdIds,
      this.simulationData.getHouseholds(),
    );

    console.log(
      `⚡ Simulation outage: ${householdIds.length} demo households affected (isolated from real data)`,
    );
    console.log(
      `🔋 Community resilience score: ${response.communityResilience.toFixed(2)}`,
    );

    // Update household statuses in simulation context only
    for (const householdId of householdIds) {
      this.simulationData.updateHousehold(householdId, {
        isOnline: false,
      });
    }

    return response;
  }

  // Restore power after outage
  async restorePower(householdIds: number[]): Promise<void> {
    for (const householdId of householdIds) {
      this.simulationData.updateHousehold(householdId, {
        isOnline: true,
      });
    }

    this.outageSimulator.clearOutage(householdIds);
    console.log(
      `🔌 Simulation power restored to ${householdIds.length} demo households`,
    );
  }

  // Main simulation cycle
  private async runSimulationCycle(): Promise<void> {
    try {
      const households = this.simulationData.getHouseholds();
      const currentWeather = this.weatherSimulator.getCurrentWeather();

      // Run ML optimization on simulation households
      const optimization = this.mlEngine.optimizeEnergyDistribution(
        households,
        currentWeather,
      );

      // Store the latest optimization result
      this.lastOptimizationResult = optimization;

      // Generate energy readings for simulation households
      this.generateEnergyReadings(households, currentWeather);

      // Execute optimal trades in simulation context
      this.executeTrades(optimization.tradingPairs, optimization.prices);

      // Update battery levels based on strategy in simulation context
      this.updateBatteryLevels(households, optimization.batteryStrategy);

      // Log key metrics
      this.logSimulationMetrics(optimization, currentWeather);
    } catch (error) {
      console.error("❌ Simulation cycle error:", error);
    }
  }

  private generateEnergyReadings(
    households: Household[],
    weather: WeatherCondition,
  ): void {
    const currentTime = new Date();
    const hour = currentTime.getHours();

    for (const household of households) {
      if (!household.isOnline) continue; // Skip households affected by outage

      const generation = this.mlEngine.predictEnergyGeneration(
        household,
        weather,
        hour,
      );
      const consumption = this.mlEngine.predictEnergyDemand(
        household,
        hour,
        currentTime.getDay(),
      );

      // Add deterministic variance based on time and household ID for more realistic patterns
      const timeVariance =
        Math.sin(((hour + household.id) * Math.PI) / 12) * 0.1; // Increased variance
      const generationVariance = generation * timeVariance;
      const consumptionVariance = consumption * timeVariance * 1.5; // More demand variance for trading opportunities

      const reading = {
        householdId: household.id,
        solarGeneration: Math.max(
          0,
          Math.round((generation + generationVariance) * 100),
        ), // Convert to Wh (realistic scale)
        energyConsumption: Math.max(
          0,
          Math.round((consumption + consumptionVariance) * 100),
        ), // Convert to Wh (realistic scale)
        batteryLevel: household.currentBatteryLevel || 0,
        weatherCondition: weather.condition,
        temperature: Math.round(weather.temperature),
      };

      // Add to simulation context instead of real database
      this.simulationData.addEnergyReading(reading);
    }
  }

  private executeTrades(
    tradingPairs: any[],
    prices: Map<number, number>,
  ): void {
    for (const pair of tradingPairs) {
      const price = prices.get(pair.supplierId) || 0.12;

      this.simulationData.addEnergyTrade({
        sellerHouseholdId: pair.supplierId,
        buyerHouseholdId: pair.demanderId,
        energyAmount: Math.round(pair.energyAmount * 1000),
        pricePerKwh: Math.round(price * 100),
        tradeType: "surplus_sale" as const,
      });
    }
  }

  private updateBatteryLevels(
    households: Household[],
    batteryStrategy: any,
  ): void {
    for (const household of households) {
      const strategy = batteryStrategy.strategies[household.id];
      let newBatteryLevel = household.currentBatteryLevel || 0;
      const maxCapacity = household.batteryCapacity || 0;

      if (!household.isOnline || maxCapacity === 0) continue;

      switch (strategy) {
        case "charge":
          newBatteryLevel = Math.min(maxCapacity, newBatteryLevel + 2); // 2kWh charge rate
          break;
        case "discharge":
          newBatteryLevel = Math.max(0, newBatteryLevel - 1.5); // 1.5kWh discharge rate
          break;
        case "sell":
        case "buy":
          // Battery level remains stable during active trading
          break;
      }

      if (newBatteryLevel !== household.currentBatteryLevel) {
        this.simulationData.updateHousehold(household.id, {
          currentBatteryLevel: newBatteryLevel,
        });
      }
    }
  }

  // Get simulation-specific data (not mixed with real operational data)
  getSimulationData(): {
    households: Household[];
    recentTrades: EnergyTrade[];
    recentReadings: EnergyReading[];
    weather: WeatherCondition;
  } {
    return {
      households: this.simulationData.getHouseholds(),
      recentTrades: this.simulationData.getRecentTrades(20),
      recentReadings: this.simulationData.getRecentReadings(50),
      weather: this.weatherSimulator.getCurrentWeather(),
    };
  }

  // Get the latest ML optimization result
  getOptimizationResult(): any {
    if (!this.lastOptimizationResult) {
      // If no optimization has run yet, return a default result
      const households = this.simulationData.getHouseholds();
      const currentWeather = this.weatherSimulator.getCurrentWeather();

      if (households.length > 0) {
        return this.mlEngine.optimizeEnergyDistribution(
          households,
          currentWeather,
        );
      } else {
        // Return empty optimization result if no households
        return {
          tradingPairs: [],
          prices: new Map(),
          batteryStrategy: { strategies: {} },
          gridStability: 0.95,
          recommendations: ["No households available for optimization"],
          timestamp: new Date(),
        };
      }
    }

    return this.lastOptimizationResult;
  }

  private selectRandomHouseholds(
    households: Household[],
    count: number,
  ): number[] {
    // Select households deterministically based on battery level (lowest first)
    const sorted = [...households].sort(
      (a, b) => (a.currentBatteryLevel || 0) - (b.currentBatteryLevel || 0),
    );
    return sorted.slice(0, count).map((h) => h.id);
  }

  public getEquityAnalysis() {
    const households = this.simulationData.getHouseholds();
    const currentWeather = this.weatherSimulator.getCurrentWeather();

    if (households.length === 0) {
      return {
        equityScore: 0.85, // Default fallback
        averageEnergySecurity: 0.75,
        vulnerableHouseholds: [],
        emergencySupport: false,
      };
    }

    // Get optimization result which includes equity analysis
    const optimization = this.mlEngine.optimizeEnergyDistribution(
      households,
      currentWeather,
    );

    // Calculate equity metrics from household data
    const totalHouseholds = households.length;
    const vulnerableCount = Math.floor(totalHouseholds * 0.15); // Assume 15% vulnerable
    const equityScore = 1 - vulnerableCount / totalHouseholds;

    return {
      equityScore,
      averageEnergySecurity: 0.78,
      vulnerableHouseholds: vulnerableCount,
      emergencySupport: vulnerableCount > totalHouseholds * 0.2,
    };
  }

  public getNetworkStats(): NetworkStats {
    // Calculate real-time stats from simulation households
    const households = this.simulationData.getHouseholds();
    const activeHouseholds = households.filter((h) => h.isOnline);
    const currentWeather = this.weatherSimulator.getCurrentWeather();
    const hour = new Date().getHours();

    // Calculate actual generation and consumption using ML engine
    let totalGeneration = 0;
    let totalConsumption = 0;
    let batteryStorageTotal = 0;

    for (const household of households) {
      if (household.isOnline) {
        const generation = this.mlEngine.predictEnergyGeneration(
          household,
          currentWeather,
          hour,
        );
        const consumption = this.mlEngine.predictEnergyDemand(
          household,
          hour,
          new Date().getDay(),
        );

        totalGeneration += generation;
        totalConsumption += consumption;
        batteryStorageTotal +=
          ((household.currentBatteryLevel || 0) *
            (household.batteryCapacity || 0)) /
          100;
      }
    }

    const recentTrades = this.simulationData.getRecentTrades(10);
    const tradingVelocity =
      recentTrades.length > 0
        ? recentTrades.reduce((sum, trade) => sum + trade.energyAmount, 0) /
          1000
        : 0; // Convert Wh to kWh

    const carbonReduction = recentTrades.reduce(
      (sum, trade) => sum + (trade.energyAmount / 1000) * 0.45,
      0, // 0.45kg CO2 per kWh saved
    );

    // Calculate dynamic metrics
    const averagePrice =
      recentTrades.length > 0
        ? recentTrades.reduce(
            (sum, trade) => sum + (trade.pricePerKwh || 0),
            0,
          ) / recentTrades.length
        : 5;

    const averageDistance = this.calculateAverageDistance(households);
    const networkEfficiency = this.calculateNetworkEfficiency(
      totalGeneration,
      totalConsumption,
    );
    const currentBatteryLevel = batteryStorageTotal; // This is already the current level calculated above

    return {
      totalHouseholds: households.length,
      activeConnections: activeHouseholds.length,
      totalGeneration: Math.round(totalGeneration * 10) / 10,
      totalConsumption: Math.round(totalConsumption * 10) / 10,
      batteryStorageTotal: Math.round(batteryStorageTotal * 10) / 10,
      currentBatteryLevel: Math.round(currentBatteryLevel * 10) / 10,
      tradingVelocity: Math.round(tradingVelocity * 10) / 10,
      carbonReduction: Math.round(carbonReduction * 10) / 10,
      averagePrice: Math.round(averagePrice * 100) / 100,
      averageDistance: Math.round(averageDistance * 100) / 100,
      networkEfficiency: Math.round(networkEfficiency * 100) / 100,
    };
  }

  private calculateAverageDistance(households: Household[]): number {
    if (households.length < 2) return 1.2; // Default fallback for single household

    // Simple distance calculation - in real app would use actual coordinates
    // For simulation, calculate based on household distribution
    const avgDistanceBetweenHouseholds = Math.sqrt(households.length) * 0.3; // km
    return Math.max(0.5, Math.min(5.0, avgDistanceBetweenHouseholds));
  }

  private calculateNetworkEfficiency(
    totalGeneration: number,
    totalConsumption: number,
  ): number {
    if (totalGeneration === 0 && totalConsumption === 0) return 85; // Default efficiency

    // Calculate efficiency as ratio of useful energy transfer
    const supplyDemandRatio =
      totalConsumption > 0 ? totalGeneration / totalConsumption : 1;
    const efficiency = Math.min(100, Math.max(50, supplyDemandRatio * 85));

    return efficiency;
  }

  private logSimulationMetrics(
    optimization: any,
    weather: WeatherCondition,
  ): void {
    console.log(
      `📊 Sim: ${weather.condition} | Grid: ${(optimization.gridStability * 100).toFixed(1)}% | Trades: ${optimization.tradingPairs.length}`,
    );
  }
}

class WeatherSimulator {
  private currentWeather: WeatherCondition;
  private weatherCycle: WeatherCondition[] = [];
  private cycleIndex: number = 0;

  constructor() {
    this.initializeWeatherCycle();
    this.currentWeather = this.weatherCycle[0];
  }

  getCurrentWeather(): WeatherCondition {
    return this.currentWeather;
  }

  setWeather(condition: WeatherCondition["condition"]): WeatherCondition {
    this.currentWeather = {
      condition,
      temperature: this.getTemperatureForCondition(condition),
      cloudCover: this.getCloudCoverForCondition(condition),
      windSpeed: this.getWindSpeedForCondition(condition),
      solarEfficiency: this.getSolarEfficiencyForCondition(condition),
    };
    return this.currentWeather;
  }

  private initializeWeatherCycle(): void {
    this.weatherCycle = [
      {
        condition: "sunny",
        temperature: 28,
        cloudCover: 10,
        windSpeed: 8,
        solarEfficiency: 0.95,
      },
      {
        condition: "partly-cloudy",
        temperature: 25,
        cloudCover: 40,
        windSpeed: 12,
        solarEfficiency: 0.75,
      },
      {
        condition: "cloudy",
        temperature: 22,
        cloudCover: 80,
        windSpeed: 15,
        solarEfficiency: 0.45,
      },
      {
        condition: "overcast",
        temperature: 20,
        cloudCover: 95,
        windSpeed: 18,
        solarEfficiency: 0.25,
      },
      {
        condition: "rainy",
        temperature: 18,
        cloudCover: 100,
        windSpeed: 22,
        solarEfficiency: 0.15,
      },
    ];
  }

  private getTemperatureForCondition(
    condition: WeatherCondition["condition"],
  ): number {
    const temps = {
      sunny: 28,
      "partly-cloudy": 25,
      cloudy: 22,
      overcast: 20,
      rainy: 18,
      stormy: 16,
    };
    const hour = new Date().getHours();
    const dailyVariation = Math.sin(((hour - 6) / 12) * Math.PI) * 3; // Natural daily temperature variation
    return Math.round(temps[condition] + dailyVariation);
  }

  private getCloudCoverForCondition(
    condition: WeatherCondition["condition"],
  ): number {
    const covers = {
      sunny: 10,
      "partly-cloudy": 40,
      cloudy: 80,
      overcast: 95,
      rainy: 100,
      stormy: 100,
    };
    return covers[condition];
  }

  private getWindSpeedForCondition(
    condition: WeatherCondition["condition"],
  ): number {
    const windSpeeds = {
      sunny: 8,
      "partly-cloudy": 12,
      cloudy: 15,
      overcast: 18,
      rainy: 22,
      stormy: 35,
    };
    return windSpeeds[condition];
  }

  private getSolarEfficiencyForCondition(
    condition: WeatherCondition["condition"],
  ): number {
    const efficiencies = {
      sunny: 0.95,
      "partly-cloudy": 0.75,
      cloudy: 0.45,
      overcast: 0.25,
      rainy: 0.15,
      stormy: 0.05,
    };
    return efficiencies[condition];
  }
}

class OutageSimulator {
  private activeOutages: Set<number> = new Set();
  private mlEngine: MLEnergyEngine;

  constructor(mlEngine: MLEnergyEngine) {
    this.mlEngine = mlEngine;
  }

  async simulateOutage(
    householdIds: number[],
    allHouseholds: Household[],
  ): Promise<OutageResponse> {
    householdIds.forEach((id) => this.activeOutages.add(id));
    return this.mlEngine.simulateOutageResponse(householdIds, allHouseholds);
  }

  getActiveOutages(): number[] {
    return Array.from(this.activeOutages);
  }

  clearOutage(householdIds: number[]): void {
    householdIds.forEach((id) => this.activeOutages.delete(id));
  }
}

// Type definitions
export interface SimulationStatus {
  isRunning: boolean;
  currentWeather: WeatherCondition;
  activeOutages: number[];
  networkStats: NetworkStats;
}

export interface NetworkStats {
  totalHouseholds: number;
  activeConnections: number;
  totalGeneration: number;
  totalConsumption: number;
  batteryStorageTotal: number;
  currentBatteryLevel: number;
  tradingVelocity: number;
  carbonReduction: number;
  averagePrice: number;
  averageDistance: number;
  networkEfficiency: number;
}
