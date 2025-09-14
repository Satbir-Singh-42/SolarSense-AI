import { Express } from "express";
import { storage } from "./storage";
import { insertEnergyTradeSchema, insertHouseholdSchema, insertChatMessageSchema, insertTradeAcceptanceSchema, simulationWeatherSchema, simulationOutageSchema } from "@shared/schema";
import { generateEnergyOptimizationResponse } from "./gemini-chat";
import { SimulationEngine } from "./simulation-engine";
import { emailService } from "./email-service";

// Extend globalThis to include the SimulationEngine property for HMR singleton pattern
declare global {
  var __simulationEngine: SimulationEngine | undefined;
}

// Singleton guard for SimulationEngine to prevent multiple instances during HMR
function getSimulationEngine(storage: any) {
  if (!globalThis.__simulationEngine) {
    console.log('🔄 Creating new SimulationEngine instance');
    globalThis.__simulationEngine = new SimulationEngine(storage);
  } else {
    console.log('♻️ Reusing existing SimulationEngine instance');
  }
  return globalThis.__simulationEngine;
}

export function setupRoutes(app: Express) {
  // Simulation engine enabled for ML functionality with singleton guard
  const simulationEngine = getSimulationEngine(storage);

  // Test email endpoint for debugging
  app.post("/api/test-email", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { email } = req.body;
      const testEmail = email || req.user!.email;
      
      console.log(`📧 Testing email delivery to: ${testEmail}`);
      const success = await emailService.sendTestEmail(testEmail);
      
      if (success) {
        res.json({ 
          success: true, 
          message: `Test email sent to ${testEmail}. Check your inbox (and spam folder).`,
          email: testEmail
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: "Failed to send test email. Check server logs for details." 
        });
      }
    } catch (error) {
      console.error('❌ Test email endpoint error:', error);
      res.status(500).json({ 
        success: false, 
        error: "Test email failed" 
      });
    }
  });

  // Health check
  app.get("/api/health", async (req, res) => {
    try {
      const timestamp = new Date().toISOString();
      res.json({ status: "healthy", timestamp });
    } catch (error) {
      res.status(500).json({ error: "Health check failed" });
    }
  });

  // SIMPLE HOUSEHOLD ENDPOINTS
  app.get("/api/households", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const households = await storage.getHouseholdsByUser(req.user!.id);
      res.json(households);
    } catch (error) {
      res.status(500).json({ error: "Failed to get households" });
    }
  });

  app.post("/api/households", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const validation = insertHouseholdSchema.safeParse({
        ...req.body,
        userId: req.user!.id
      });
      
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.issues });
      }
      
      const household = await storage.createHousehold(validation.data);
      res.json(household);
    } catch (error) {
      res.status(500).json({ error: "Failed to create household" });
    }
  });

  // User Energy History/Activity Endpoint (replaces analyses)
  app.get("/api/analyses", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Get user's energy trading activity as "analyses"
      const userTrades = await storage.getEnergyTradesByUser(req.user!.id);
      const userHouseholds = await storage.getHouseholdsByUser(req.user!.id);
      
      // Convert energy trades to analysis-like format
      const analyses = userTrades.map((trade: any) => ({
        id: trade.id,
        userId: req.user!.id,
        type: trade.tradeType, // 'buy' or 'sell'
        createdAt: trade.createdAt,
        results: {
          energyAmount: trade.energyAmount, // Energy is stored as kWh, no conversion needed
          pricePerKwh: Math.round(trade.pricePerKwh), // Already in rupees
          totalValue: trade.energyAmount * Math.round(trade.pricePerKwh),
          status: trade.status,
          tradeType: trade.tradeType,
          householdType: trade.sellerHouseholdId ? 'seller' : 'buyer'
        },
        status: trade.status,
        householdId: trade.sellerHouseholdId || trade.buyerHouseholdId
      }));

      res.json(analyses);
    } catch (error) {
      res.status(500).json({ error: "Failed to get user energy activity" });
    }
  });

  // SIMPLE ENERGY TRADING ENDPOINTS
  app.get("/api/energy-trades", async (req, res) => {
    try {
      // Require authentication for energy trades
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required. Please log in to view energy trades." });
      }

      const trades = await storage.getEnergyTradesByUser(req.user!.id);
      res.json(trades);
    } catch (error) {
      res.status(500).json({ error: "Failed to get energy trades" });
    }
  });

  app.post("/api/energy-trades", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      // Get user's household
      const userHouseholds = await storage.getHouseholdsByUser(req.user!.id);
      if (userHouseholds.length === 0) {
        return res.status(400).json({ error: "No household found. Please create a household first." });
      }

      const { energyAmount, pricePerKwh, tradeType, sellerHouseholdId, buyerHouseholdId } = req.body;

      if (!energyAmount || !pricePerKwh || !tradeType) {
        return res.status(400).json({ error: "Missing required fields: energyAmount, pricePerKwh, tradeType" });
      }

      if (energyAmount <= 0 || pricePerKwh <= 0) {
        return res.status(400).json({ error: "Energy amount and price must be positive" });
      }

      // Validate household ownership
      const userHouseholdIds = userHouseholds.map(h => h.id);
      const requestedHouseholdId = tradeType === 'sell' ? sellerHouseholdId : buyerHouseholdId;
      
      if (requestedHouseholdId && !userHouseholdIds.includes(requestedHouseholdId)) {
        return res.status(403).json({ error: "You can only create trades for your own households" });
      }

      const tradeData = {
        sellerHouseholdId: tradeType === 'sell' ? (sellerHouseholdId || userHouseholds[0].id) : undefined,
        buyerHouseholdId: tradeType === 'buy' ? (buyerHouseholdId || userHouseholds[0].id) : undefined,
        energyAmount: Math.round(parseFloat(energyAmount)), // Database expects integer
        pricePerKwh: Math.round(parseFloat(pricePerKwh)), // Store as rupees
        tradeType
      };

      const trade = await storage.createEnergyTrade(tradeData);
      res.json({ success: true, trade });
    } catch (error) {
      console.error('Failed to create trade:', error);
      res.status(500).json({ error: "Failed to create trade" });
    }
  });

  // Update energy trade
  app.put("/api/energy-trades/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const tradeId = parseInt(req.params.id);
      const { energyAmount, pricePerKwh, tradeType, sellerHouseholdId, buyerHouseholdId } = req.body;

      // Get the existing trade to verify ownership
      const existingTrade = await storage.getEnergyTradeById(tradeId);
      if (!existingTrade) {
        return res.status(404).json({ error: "Trade not found" });
      }

      // Get user's households to verify ownership
      const userHouseholds = await storage.getHouseholdsByUser(req.user!.id);
      const userHouseholdIds = userHouseholds.map(h => h.id);
      
      if (userHouseholdIds.length === 0) {
        return res.status(400).json({ error: "No household found. Please create a household first." });
      }
      
      // Check if user owns this trade (through any of their households)
      const ownsThisTrade = (existingTrade.sellerHouseholdId && userHouseholdIds.includes(existingTrade.sellerHouseholdId)) ||
                           (existingTrade.buyerHouseholdId && userHouseholdIds.includes(existingTrade.buyerHouseholdId));
      
      if (!ownsThisTrade) {
        return res.status(403).json({ error: "You can only edit your own trades" });
      }

      // Check if there are any applications for this trade
      const applications = await storage.getTradeAcceptancesByTrade(tradeId);
      if (applications && applications.length > 0) {
        return res.status(409).json({ 
          error: "Cannot edit trade after users have applied. You can award the trade to an applicant instead." 
        });
      }

      if (!energyAmount || !pricePerKwh || !tradeType) {
        return res.status(400).json({ error: "Missing required fields: energyAmount, pricePerKwh, tradeType" });
      }

      if (energyAmount <= 0 || pricePerKwh <= 0) {
        return res.status(400).json({ error: "Energy amount and price must be positive" });
      }

      // Validate household ownership for updates  
      const requestedHouseholdId = tradeType === 'sell' ? sellerHouseholdId : buyerHouseholdId;
      
      if (requestedHouseholdId && !userHouseholdIds.includes(requestedHouseholdId)) {
        return res.status(403).json({ error: "You can only update trades for your own households" });
      }

      const updatedTradeData = {
        energyAmount: Math.round(parseFloat(energyAmount)), // Database expects integer
        pricePerKwh: Math.round(parseFloat(pricePerKwh)), // Store as rupees
        tradeType,
        sellerHouseholdId: tradeType === 'sell' ? (sellerHouseholdId || userHouseholds[0].id) : undefined,
        buyerHouseholdId: tradeType === 'buy' ? (buyerHouseholdId || userHouseholds[0].id) : undefined,
      };

      const updatedTrade = await storage.updateEnergyTrade(tradeId, updatedTradeData);
      res.json({ success: true, trade: updatedTrade });
    } catch (error) {
      console.error('Failed to update trade:', error);
      res.status(500).json({ error: "Failed to update trade" });
    }
  });

  // Cancel energy trade (update status to 'cancelled')
  app.patch("/api/energy-trades/:id/cancel", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const tradeId = parseInt(req.params.id);

      // Get the existing trade to verify ownership
      const existingTrade = await storage.getEnergyTradeById(tradeId);
      if (!existingTrade) {
        return res.status(404).json({ error: "Trade not found" });
      }

      // Check if trade can be cancelled (only pending trades)
      if (existingTrade.status !== 'pending') {
        return res.status(400).json({ error: "Only pending trades can be cancelled" });
      }

      // Get user's household to verify ownership
      const userHouseholds = await storage.getHouseholdsByUser(req.user!.id);
      const userHouseholdId = userHouseholds[0]?.id;
      
      if (!userHouseholdId || 
          (existingTrade.sellerHouseholdId !== userHouseholdId && 
           existingTrade.buyerHouseholdId !== userHouseholdId)) {
        return res.status(403).json({ error: "You can only cancel your own trades" });
      }

      const cancelledTrade = await storage.updateEnergyTradeStatus(tradeId, 'cancelled');
      
      // Notify all applicants about the trade cancellation
      try {
        const applications = await storage.getTradeAcceptancesByTrade(tradeId);
        if (applications.length > 0) {
          console.log(`📧 Notifying ${applications.length} applicants about trade cancellation`);
          
          // Send cancellation notifications to all applicants
          await Promise.all(
            applications.map(async (application) => {
              try {
                const applicantUser = await storage.getUser(application.acceptorUserId);
                if (applicantUser && cancelledTrade) {
                  await emailService.sendTradeCancellationNotification(
                    applicantUser,
                    cancelledTrade,
                    req.user!.username
                  );
                }
              } catch (emailError) {
                console.error(`Failed to send cancellation email to applicant ${application.acceptorUserId}:`, emailError);
              }
            })
          );
        }
      } catch (emailError) {
        console.error('Failed to send trade cancellation notifications:', emailError);
        // Don't fail the entire request if email fails
      }
      
      res.json({ success: true, trade: cancelledTrade, message: "Trade cancelled successfully. All applicants have been notified." });
    } catch (error) {
      console.error('Failed to cancel trade:', error);
      res.status(500).json({ error: "Failed to cancel trade" });
    }
  });

  // Delete energy trade
  app.delete("/api/energy-trades/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const tradeId = parseInt(req.params.id);

      // Get the existing trade to verify ownership
      const existingTrade = await storage.getEnergyTradeById(tradeId);
      if (!existingTrade) {
        return res.status(404).json({ error: "Trade not found" });
      }

      // Get user's household to verify ownership
      const userHouseholds = await storage.getHouseholdsByUser(req.user!.id);
      const userHouseholdId = userHouseholds[0]?.id;
      
      if (!userHouseholdId || 
          (existingTrade.sellerHouseholdId !== userHouseholdId && 
           existingTrade.buyerHouseholdId !== userHouseholdId)) {
        return res.status(403).json({ error: "You can only delete your own trades" });
      }

      // Notify all applicants before deleting the trade
      try {
        const applications = await storage.getTradeAcceptancesByTrade(tradeId);
        if (applications.length > 0) {
          console.log(`📧 Notifying ${applications.length} applicants about trade deletion`);
          
          // Send cancellation notifications to all applicants
          await Promise.all(
            applications.map(async (application) => {
              try {
                const applicantUser = await storage.getUser(application.acceptorUserId);
                if (applicantUser) {
                  await emailService.sendTradeCancellationNotification(
                    applicantUser,
                    existingTrade,
                    req.user!.username
                  );
                }
              } catch (emailError) {
                console.error(`Failed to send deletion email to applicant ${application.acceptorUserId}:`, emailError);
              }
            })
          );
        }
      } catch (emailError) {
        console.error('Failed to send trade deletion notifications:', emailError);
        // Don't fail the entire request if email fails
      }

      await storage.deleteEnergyTrade(tradeId);
      res.json({ success: true, message: "Trade deleted successfully. All applicants have been notified." });
    } catch (error) {
      console.error('Failed to delete trade:', error);
      res.status(500).json({ error: "Failed to delete trade" });
    }
  });

  // Energy readings endpoint
  app.get("/api/energy-readings", async (req, res) => {
    try {
      // Require authentication for energy readings
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required. Please log in to view energy readings." });
      }

      const readings = await storage.getEnergyReadings();
      res.json(readings);
    } catch (error) {
      res.status(500).json({ error: "Failed to get energy readings" });
    }
  });

  // Real-time market data
  app.get("/api/market/realtime", async (req, res) => {
    try {
      // Require authentication for market data
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required. Please log in to view market data." });
      }

      const { latitude, longitude } = req.query;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ error: "Location required for accurate market data. Please provide latitude and longitude." });
      }

      const lat = parseFloat(latitude as string);
      const lon = parseFloat(longitude as string);
      
      if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({ error: "Invalid coordinates. Latitude and longitude must be numbers." });
      }

      const marketData = await storage.getRealtimeMarketData(lat, lon);
      res.json(marketData);
    } catch (error) {
      console.error('Real-time market data error:', error);
      res.status(500).json({ error: "Failed to get market data" });
    }
  });

  // Network analytics
  app.get("/api/analytics/network", async (req, res) => {
    try {
      // Require authentication for network analytics
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required. Please log in to view network analytics." });
      }

      const analytics = await storage.getNetworkAnalytics();
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: "Failed to get network analytics" });
    }
  });

  // Chat endpoint for AI assistant
  app.post("/api/ai/chat", async (req, res) => {
    try {
      // Require authentication for chat
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required. Please log in to use the chat." });
      }

      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Get user info for chat message storage
      const userId = req.user?.id || null;
      const sessionId = req.sessionId || `session_${Date.now()}`;
      const username = req.user?.username || 'Anonymous';
      
      // Debug session info
      console.log('💬 Chat session debug:', {
        sessionId: req.sessionId,
        userId: req.user?.id,
        username: req.user?.username,
        isAuthenticated: req.isAuthenticated(),
        cookies: req.cookies,
        headers: req.headers['x-session-id']
      });

      // Save user message to database
      try {
        await storage.createChatMessage({
          userId,
          sessionId,
          username,
          message,
          type: 'user',
          category: 'energy-consultation'
        });
      } catch (error) {
        console.warn('Failed to save user message:', error);
      }

      // Use Gemini AI for chat responses
      try {
        // Get user context
        const households = req.user ? await storage.getHouseholdsByUser(req.user.id) : [];
        const userContext = {
          username,
          location: 'Ludhiana, Punjab, India', // From the logs we can see user is in Ludhiana
          households,
          energyData: households.length > 0
        };

        const response = await generateEnergyOptimizationResponse(message, userContext);
        
        // Save AI response to database
        try {
          await storage.createChatMessage({
            userId,
            sessionId,
            username: 'SolarSense AI',
            message: response,
            type: 'ai',
            category: 'energy-consultation'
          });
        } catch (error) {
          console.warn('Failed to save AI response:', error);
        }

        res.json({ 
          response, 
          category: 'energy-consultation' 
        });
      } catch (aiError) {
        console.error('Gemini AI error:', aiError);
        const errorResponse = "Energy assistant is temporarily unavailable. Please try again later.";
        
        // Save error response to database
        try {
          await storage.createChatMessage({
            userId,
            sessionId,
            username: 'SolarSense AI',
            message: errorResponse,
            type: 'system',
            category: 'error'
          });
        } catch (error) {
          console.warn('Failed to save error response:', error);
        }

        res.json({ 
          response: errorResponse, 
          category: 'error' 
        });
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorResponse = "I'm having trouble right now. Please try again in a moment.";
      
      // Try to save error message to database
      try {
        const userId = req.user?.id || null;
        const sessionId = req.sessionID || `session_${Date.now()}`;
        await storage.createChatMessage({
          userId,
          sessionId,
          username: 'SolarSense AI',
          message: errorResponse,
          type: 'system',
          category: 'error'
        });
      } catch (dbError) {
        console.warn('Failed to save error message to database:', dbError);
      }

      res.json({ 
        response: errorResponse, 
        category: 'error' 
      });
    }
  });

  // Get chat history
  app.get("/api/chat/messages", async (req, res) => {
    try {
      const { limit } = req.query;
      const messageLimit = limit ? parseInt(limit as string) : 50;
      
      let messages: any[];
      if (req.user?.id) {
        // Get messages for authenticated user
        messages = await storage.getChatMessagesByUser(req.user.id, messageLimit);
      } else if (req.sessionID) {
        // Get messages for session
        messages = await storage.getChatMessagesBySession(req.sessionID, messageLimit);
      } else {
        messages = [];
      }
      
      res.json(messages);
    } catch (error) {
      console.error('Failed to get chat messages:', error);
      res.status(500).json({ error: "Failed to get chat history" });
    }
  });

  // Clear chat history
  app.post("/api/chat/clear", async (req, res) => {
    try {
      if (req.sessionID) {
        await storage.clearSessionData(req.sessionID);
        res.json({ success: true, message: "Chat history cleared" });
      } else {
        res.status(400).json({ error: "No session found" });
      }
    } catch (error) {
      console.error('Failed to clear chat history:', error);
      res.status(500).json({ error: "Failed to clear chat history" });
    }
  });

  // SIMULATION ENDPOINTS - ML functionality enabled

  // Get simulation status
  app.get("/api/simulation/status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const status = simulationEngine.getStatus();
      res.json(status);
    } catch (error) {
      console.error('Failed to get simulation status:', error);
      res.status(500).json({ error: "Failed to get simulation status" });
    }
  });

  // Start simulation
  app.post("/api/simulation/start", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      await simulationEngine.startSimulation();
      res.json({ 
        success: true, 
        message: "Simulation started successfully",
        isRunning: true 
      });
    } catch (error) {
      console.error('Failed to start simulation:', error);
      res.status(500).json({ error: "Failed to start simulation" });
    }
  });

  // Stop simulation
  app.post("/api/simulation/stop", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      simulationEngine.stopSimulation();
      res.json({ 
        success: true, 
        message: "Simulation stopped successfully",
        isRunning: false 
      });
    } catch (error) {
      console.error('Failed to stop simulation:', error);
      res.status(500).json({ error: "Failed to stop simulation" });
    }
  });

  // Change weather in simulation
  app.post("/api/simulation/weather", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const validation = simulationWeatherSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.issues });
      }
      
      const { condition } = validation.data;
      const weather = await simulationEngine.triggerWeatherChange(condition);
      res.json({ 
        success: true, 
        message: `Weather changed to ${condition}`,
        impact: `Solar efficiency: ${Math.round(weather.solarEfficiency * 100)}%`,
        weather 
      });
    } catch (error) {
      console.error('Failed to change weather:', error);
      res.status(500).json({ error: "Failed to change weather" });
    }
  });

  // Trigger power outage
  app.post("/api/simulation/outage", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const validation = simulationOutageSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.issues });
      }
      
      const { householdIds } = validation.data;
      const outageResponse = await simulationEngine.triggerOutage(householdIds);
      res.json({
        success: true,
        message: `Power outage affecting ${householdIds?.length || 'random'} households`,
        outageResponse
      });
    } catch (error) {
      console.error('Failed to trigger outage:', error);
      res.status(500).json({ error: "Failed to trigger outage" });
    }
  });

  // Get ML optimization results
  app.get("/api/ml/optimization", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const optimization = simulationEngine.getOptimizationResult();
      res.json({ optimization });
    } catch (error) {
      console.error('Failed to get optimization:', error);
      res.status(500).json({ error: "Failed to get optimization results" });
    }
  });

  // Get simulation analytics
  app.get("/api/simulation/analytics", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const stats = simulationEngine.getNetworkStats();
      const equityData = simulationEngine.getEquityAnalysis();
      const analytics = {
        network: {
          totalHouseholds: stats.totalHouseholds,
          activeHouseholds: stats.activeConnections,
          totalGenerationCapacity: `${stats.totalGeneration} kW`,
          totalStorageCapacity: `${stats.batteryStorageTotal} kWh`,
          currentStorageLevel: `${Math.round(stats.currentBatteryLevel)} kWh`,
          storageUtilization: `${Math.round((stats.currentBatteryLevel / stats.batteryStorageTotal) * 100)}%`
        },
        trading: {
          totalTrades: Math.round(stats.tradingVelocity * 10),
          totalEnergyTraded: `${stats.tradingVelocity * 24} kWh`,
          averagePrice: `₹${stats.averagePrice || 0}/kWh`,
          carbonSaved: `${stats.carbonReduction} kg CO2`
        },
        efficiency: {
          averageDistance: `${stats.averageDistance || 0} km`,
          networkEfficiency: `${Math.round(stats.networkEfficiency || 0)}%`
        },
        equity: {
          fairDistributionScore: Math.round(equityData.equityScore * 100), // Convert to percentage
          averageEnergySecurity: Math.round(equityData.averageEnergySecurity * 100),
          vulnerableHouseholds: typeof equityData.vulnerableHouseholds === 'number' ? 
            equityData.vulnerableHouseholds : equityData.vulnerableHouseholds.length,
          emergencySupport: equityData.emergencySupport
        }
      };
      res.json(analytics);
    } catch (error) {
      console.error('Failed to get simulation analytics:', error);
      res.status(500).json({ error: "Failed to get simulation analytics" });
    }
  });

  // TRADE ACCEPTANCE ENDPOINTS - Peer-to-peer trading without payment processing
  
  // Get available offers for a user (exclude their own offers)
  app.get("/api/trade-offers", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const availableOffers = await storage.getAvailableOffersForUser(req.user!.id);
      res.json(availableOffers);
    } catch (error) {
      console.error('Failed to get available offers:', error);
      res.status(500).json({ error: "Failed to get available offers" });
    }
  });

  // Accept a trade offer
  app.post("/api/trade-acceptances", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { tradeId } = req.body;
      
      if (!tradeId) {
        return res.status(400).json({ error: "Trade ID is required" });
      }

      // Security: Get applicant's household from authenticated user (not from client)
      const userHouseholds = await storage.getHouseholdsByUser(req.user!.id);
      if (userHouseholds.length === 0) {
        return res.status(400).json({ error: "No household found. Please create a household first." });
      }
      const acceptorHouseholdId = userHouseholds[0].id;

      // Verify trade exists and is still pending
      const trade = await storage.getEnergyTradeById(tradeId);
      if (!trade) {
        return res.status(404).json({ error: "Trade not found" });
      }
      
      if (trade.status !== 'pending') {
        return res.status(400).json({ error: "This trade is no longer accepting applications" });
      }

      // Prevent applying to own trade
      const userHouseholdIds = userHouseholds.map(h => h.id);
      const isOwnTrade = (trade.sellerHouseholdId && userHouseholdIds.includes(trade.sellerHouseholdId)) ||
                         (trade.buyerHouseholdId && userHouseholdIds.includes(trade.buyerHouseholdId));
      
      if (isOwnTrade) {
        return res.status(400).json({ error: "You cannot apply to your own trade" });
      }

      // Check for duplicate applications
      const existingApplications = await storage.getTradeAcceptancesByTrade(tradeId);
      const alreadyApplied = existingApplications.some(app => app.acceptorHouseholdId === acceptorHouseholdId);
      
      if (alreadyApplied) {
        return res.status(400).json({ error: "You have already applied to this trade" });
      }

      // Create secure application data
      const applicationData = {
        tradeId: parseInt(tradeId),
        acceptorUserId: req.user!.id,
        acceptorHouseholdId: acceptorHouseholdId
      };

      const validation = insertTradeAcceptanceSchema.safeParse(applicationData);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.issues });
      }
      
      // Create application - do NOT update trade status yet, keep it available for others
      const acceptance = await storage.createTradeAcceptance(validation.data);
      console.log(`📝 Application created for trade ${validation.data.tradeId} by user ${req.user!.id} (household ${acceptorHouseholdId})`);
      
      // Note: Trade remains in 'pending' status and visible to other users
      // The creator will award the trade to a specific applicant later
      
      // Send email notification to the offer creator
      try {
        // Get the trade details
        const trade = await storage.getEnergyTradeById(validation.data.tradeId);
        if (trade) {
          // Get the offer creator's information
          let offerCreatorUser = null;
          let household = null;
          
          if (trade.sellerHouseholdId) {
            household = await storage.getHousehold(trade.sellerHouseholdId);
            if (household) {
              offerCreatorUser = await storage.getUser(household.userId);
            }
          } else if (trade.buyerHouseholdId) {
            household = await storage.getHousehold(trade.buyerHouseholdId);
            if (household) {
              offerCreatorUser = await storage.getUser(household.userId);
            }
          }
          
          if (offerCreatorUser && household) {
            // Send email notification
            await emailService.sendTradeAcceptanceNotification({
              offerCreator: offerCreatorUser,
              acceptor: req.user!,
              trade: trade,
              household: household
            });
            console.log(`📧 Email notification sent to offer creator: ${offerCreatorUser.email}`);
          }
        }
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the entire request if email fails
      }
      
      res.json({ 
        success: true, 
        acceptance, 
        message: "Application submitted! The offer creator has been notified. They will review all applications and choose who to share their energy with." 
      });
    } catch (error) {
      console.error('Failed to accept trade:', error);
      res.status(500).json({ error: "Failed to accept trade offer" });
    }
  });

  // Get applications for a specific trade (only owner can see all)
  app.get("/api/energy-trades/:id/applications", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const tradeId = parseInt(req.params.id);
      const trade = await storage.getEnergyTradeById(tradeId);
      
      if (!trade) {
        return res.status(404).json({ error: "Trade not found" });
      }

      // Check if user owns this trade
      const userHouseholds = await storage.getHouseholdsByUser(req.user!.id);
      const userHouseholdIds = userHouseholds.map(h => h.id);
      
      const isOwner = (trade.sellerHouseholdId && userHouseholdIds.includes(trade.sellerHouseholdId)) ||
                      (trade.buyerHouseholdId && userHouseholdIds.includes(trade.buyerHouseholdId));

      if (!isOwner) {
        return res.status(403).json({ error: "Only trade owner can view applications" });
      }

      const applications = await storage.getTradeAcceptancesByTrade(tradeId);
      
      // Enrich with applicant information
      const enrichedApplications = await Promise.all(
        applications.map(async (app) => {
          const applicantHousehold = await storage.getHousehold(app.acceptorHouseholdId);
          const applicantUser = applicantHousehold ? await storage.getUser(applicantHousehold.userId) : null;
          
          return {
            ...app,
            applicant: applicantUser ? {
              username: applicantUser.username,
              email: applicantUser.email,
              district: applicantUser.district,
              state: applicantUser.state
            } : null,
            household: applicantHousehold ? {
              name: applicantHousehold.name,
              solarCapacity: applicantHousehold.solarCapacity,
              batteryCapacity: applicantHousehold.batteryCapacity
            } : null
          };
        })
      );

      res.json(enrichedApplications);
    } catch (error) {
      console.error('Failed to get trade applications:', error);
      res.status(500).json({ error: "Failed to get trade applications" });
    }
  });

  // Award trade to a specific applicant
  app.post("/api/energy-trades/:id/award", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const tradeId = parseInt(req.params.id);
      const { applicationId } = req.body;

      if (!applicationId) {
        return res.status(400).json({ error: "Application ID is required" });
      }

      const trade = await storage.getEnergyTradeById(tradeId);
      if (!trade) {
        return res.status(404).json({ error: "Trade not found" });
      }

      // Verify ownership
      const userHouseholds = await storage.getHouseholdsByUser(req.user!.id);
      const userHouseholdIds = userHouseholds.map(h => h.id);
      
      const isOwner = (trade.sellerHouseholdId && userHouseholdIds.includes(trade.sellerHouseholdId)) ||
                      (trade.buyerHouseholdId && userHouseholdIds.includes(trade.buyerHouseholdId));

      if (!isOwner) {
        return res.status(403).json({ error: "Only trade owner can award trades" });
      }

      // Get the winning application
      const winningApplication = await storage.getTradeAcceptancesByTrade(tradeId);
      const selectedApp = winningApplication.find(app => app.id === parseInt(applicationId));
      
      if (!selectedApp) {
        return res.status(404).json({ error: "Application not found" });
      }

      // Update the trade with the winning applicant
      const acceptorHouseholdId = selectedApp.acceptorHouseholdId;
      let tradeUpdates: any = {};
      
      if (trade.sellerHouseholdId && !trade.buyerHouseholdId) {
        // Seller exists, winner becomes buyer
        tradeUpdates.buyerHouseholdId = acceptorHouseholdId;
        tradeUpdates.status = 'accepted';
      } else if (trade.buyerHouseholdId && !trade.sellerHouseholdId) {
        // Buyer exists, winner becomes seller
        tradeUpdates.sellerHouseholdId = acceptorHouseholdId;
        tradeUpdates.status = 'accepted';
      }

      // Update trade
      await storage.updateEnergyTrade(tradeId, tradeUpdates);
      
      // Decline other applications first
      const otherApplications = winningApplication.filter(app => app.id !== parseInt(applicationId));
      await Promise.all(
        otherApplications.map(app => storage.updateTradeAcceptanceStatus(app.id, 'declined'))
      );

      console.log(`🏆 Trade ${tradeId} awarded to application ${applicationId} (household ${acceptorHouseholdId})`);

      // Automatically share contact information between both parties
      try {
        // Get the offer creator (User A)
        const offerCreator = req.user!;
        
        // Get the acceptor user (User B)
        const acceptorUser = await storage.getUser(selectedApp.acceptorUserId);
        
        if (acceptorUser) {
          // Send contact info to the acceptor (User B gets User A's details)
          await emailService.sendContactSharingNotification(
            acceptorUser,
            offerCreator,
            trade
          );
          console.log(`📧 Contact details sent to acceptor: ${acceptorUser.email}`);
          
          // Send contact info to the offer creator (User A gets User B's details)
          await emailService.sendContactSharingNotification(
            offerCreator,
            acceptorUser,
            trade
          );
          console.log(`📧 Contact details sent to offer creator: ${offerCreator.email}`);
          
          // Update winning application status to 'contacted' so UI shows coordination phase
          await storage.updateTradeAcceptanceStatus(selectedApp.id, 'contacted');
          console.log(`📱 Application status updated to 'contacted' for coordination phase`);
        }
      } catch (emailError) {
        console.error('Failed to send automatic contact sharing notifications:', emailError);
        // Don't fail the entire request if email fails - but don't set to contacted if emails failed
        await storage.updateTradeAcceptanceStatus(selectedApp.id, 'awarded');
      }

      res.json({ 
        success: true, 
        message: "Trade awarded successfully! Contact information has been automatically shared between both parties via email.",
        trade: await storage.getEnergyTradeById(tradeId)
      });
    } catch (error) {
      console.error('Failed to award trade:', error);
      res.status(500).json({ error: "Failed to award trade" });
    }
  });

  // Get trade acceptances for a user
  app.get("/api/trade-acceptances", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const acceptances = await storage.getTradeAcceptancesByUser(req.user!.id);
      res.json(acceptances);
    } catch (error) {
      console.error('Failed to get trade acceptances:', error);
      res.status(500).json({ error: "Failed to get trade acceptances" });
    }
  });

  // Get applications TO your trades (people who want to accept your trades)
  app.get("/api/my-trade-applications", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const applications = await storage.getApplicationsToMyTrades(req.user!.id);
      res.json(applications);
    } catch (error) {
      console.error('Failed to get trade applications:', error);
      res.status(500).json({ error: "Failed to get trade applications" });
    }
  });

  // Share contact information after acceptance
  app.post("/api/trade-acceptances/:id/share-contact", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const acceptanceId = parseInt(req.params.id);
      
      // SECURITY: Check user's acceptances to verify permission
      const userAcceptances = await storage.getTradeAcceptancesByUser(req.user!.id);
      const acceptance = userAcceptances.find(acc => acc.id === acceptanceId);
      
      if (!acceptance) {
        // If not the acceptor, check if user owns the trade
        const userTrades = await storage.getEnergyTradesByUser(req.user!.id);
        const userAcceptedTrades = await Promise.all(
          userTrades.map(async (trade) => {
            const acceptances = await storage.getTradeAcceptancesByTrade(trade.id);
            return acceptances.find(acc => acc.id === acceptanceId);
          })
        );
        
        const foundAcceptance = userAcceptedTrades.find(acc => acc !== undefined);
        
        if (!foundAcceptance) {
          return res.status(403).json({ 
            error: "Access denied - you are not authorized for this acceptance" 
          });
        }
        
        // SECURITY: Only allow contact sharing for 'awarded' trades
        if (foundAcceptance.status !== 'awarded') {
          return res.status(403).json({ 
            error: "Contact sharing is only available for awarded trades" 
          });
        }
      } else {
        // User is the acceptor - verify status
        if (acceptance.status !== 'awarded') {
          return res.status(403).json({ 
            error: "Contact sharing is only available for awarded trades" 
          });
        }
      }

      const contactInfo = await storage.shareContactInfo(acceptanceId);
      
      // Send email notification about contact sharing
      try {
        if (contactInfo.contactInfo && contactInfo.trade) {
          // Get the recipient (the other party in the trade)
          let recipientUser = null;
          
          // If current user is the acceptor, notify the offer creator
          // If current user is the offer creator, notify the acceptor
          if (contactInfo.acceptance?.acceptorUserId === req.user!.id) {
            // Current user is acceptor, notify offer creator
            if (contactInfo.trade.sellerHouseholdId) {
              const household = await storage.getHousehold(contactInfo.trade.sellerHouseholdId);
              if (household) {
                recipientUser = await storage.getUser(household.userId);
              }
            } else if (contactInfo.trade.buyerHouseholdId) {
              const household = await storage.getHousehold(contactInfo.trade.buyerHouseholdId);
              if (household) {
                recipientUser = await storage.getUser(household.userId);
              }
            }
          } else {
            // Current user is offer creator, notify acceptor
            recipientUser = await storage.getUser(contactInfo.acceptance!.acceptorUserId);
          }
          
          if (recipientUser) {
            await emailService.sendContactSharingNotification(
              recipientUser,
              req.user!,
              contactInfo.trade
            );
            console.log(`📧 Contact sharing notification sent to: ${recipientUser.email}`);
          }
        }
      } catch (emailError) {
        console.error('Failed to send contact sharing notification:', emailError);
        // Don't fail the entire request if email fails
      }
      
      res.json({
        success: true,
        message: "Contact information shared for energy delivery coordination. The other party has been notified via email.",
        contactInfo: contactInfo.contactInfo,
        trade: contactInfo.trade
      });
    } catch (error) {
      console.error('Failed to share contact info:', error);
      res.status(500).json({ error: "Failed to share contact information" });
    }
  });

  // Update trade acceptance status
  app.patch("/api/trade-acceptances/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const acceptanceId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }
      
      const acceptance = await storage.updateTradeAcceptanceStatus(acceptanceId, status);
      
      if (!acceptance) {
        return res.status(404).json({ error: "Trade acceptance not found" });
      }
      
      res.json({
        success: true,
        acceptance,
        message: `Trade acceptance status updated to ${status}`
      });
    } catch (error) {
      console.error('Failed to update trade acceptance:', error);
      res.status(500).json({ error: "Failed to update trade acceptance" });
    }
  });

  // Delete trade acceptance (cancel application)
  app.delete("/api/trade-acceptances/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const acceptanceId = parseInt(req.params.id);
      
      // Verify the acceptance belongs to the current user
      const userAcceptances = await storage.getTradeAcceptancesByUser(req.user!.id);
      const acceptance = userAcceptances.find(a => a.id === acceptanceId);
      
      if (!acceptance) {
        return res.status(404).json({ error: "Trade acceptance not found or access denied" });
      }
      
      // Get trade information and offer creator before deleting
      const trade = await storage.getEnergyTradeById(acceptance.tradeId);
      let offerCreator = null;
      
      if (trade) {
        // Find the offer creator by checking household ownership
        if (trade.sellerHouseholdId) {
          const household = await storage.getHousehold(trade.sellerHouseholdId);
          if (household) {
            offerCreator = await storage.getUser(household.userId);
          }
        } else if (trade.buyerHouseholdId) {
          const household = await storage.getHousehold(trade.buyerHouseholdId);
          if (household) {
            offerCreator = await storage.getUser(household.userId);
          }
        }
      }
      
      const deleted = await storage.deleteTradeAcceptance(acceptanceId);
      
      if (!deleted) {
        return res.status(404).json({ error: "Trade acceptance not found" });
      }
      
      // Notify the offer creator about the application cancellation
      try {
        if (offerCreator && trade) {
          await emailService.sendApplicationCancellationNotification(
            offerCreator,
            req.user!,
            trade
          );
          console.log(`📧 Application cancellation notification sent to offer creator: ${offerCreator.email}`);
        }
      } catch (emailError) {
        console.error('Failed to send application cancellation notification:', emailError);
        // Don't fail the entire request if email fails
      }
      
      res.json({
        success: true,
        message: "Trade application cancelled successfully. The offer creator has been notified."
      });
    } catch (error) {
      console.error('Failed to delete trade acceptance:', error);
      res.status(500).json({ error: "Failed to cancel trade application" });
    }
  });

  // Withdraw application (applicant only, when status='applied')
  app.patch("/api/trade-acceptances/:id/withdraw", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const acceptanceId = parseInt(req.params.id);
      
      // Verify the acceptance belongs to the current user
      const userAcceptances = await storage.getTradeAcceptancesByUser(req.user!.id);
      const acceptance = userAcceptances.find(a => a.id === acceptanceId);
      
      if (!acceptance) {
        return res.status(404).json({ error: "Trade acceptance not found or access denied" });
      }
      
      // Only allow withdrawal when status is 'applied'
      if (acceptance.status !== 'applied') {
        return res.status(400).json({ error: "Can only withdraw applications that are in 'applied' status" });
      }
      
      const updatedAcceptance = await storage.updateTradeAcceptanceStatus(acceptanceId, 'withdrawn');
      
      if (!updatedAcceptance) {
        return res.status(404).json({ error: "Trade acceptance not found" });
      }
      
      res.json({
        success: true,
        acceptance: updatedAcceptance,
        message: "Application withdrawn successfully"
      });
    } catch (error) {
      console.error('Failed to withdraw application:', error);
      res.status(500).json({ error: "Failed to withdraw application" });
    }
  });

  // Owner decision (accept/reject application)
  app.patch("/api/trade-acceptances/:id/owner-decision", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const acceptanceId = parseInt(req.params.id);
      const { decision } = req.body;
      
      if (!decision || !['accept', 'reject'].includes(decision)) {
        return res.status(400).json({ error: "Decision must be 'accept' or 'reject'" });
      }
      
      // Get the acceptance by checking user's acceptances first
      const userAcceptances = await storage.getTradeAcceptancesByUser(req.user!.id);
      let acceptance = userAcceptances.find(a => a.id === acceptanceId);
      
      // If not found in user's acceptances, check if user owns trades that have this acceptance
      if (!acceptance) {
        const userTrades = await storage.getEnergyTradesByUser(req.user!.id);
        for (const trade of userTrades) {
          const tradeAcceptances = await storage.getTradeAcceptancesByTrade(trade.id);
          const foundAcceptance = tradeAcceptances.find(a => a.id === acceptanceId);
          if (foundAcceptance) {
            acceptance = foundAcceptance;
            break;
          }
        }
      }
      
      if (!acceptance) {
        return res.status(404).json({ error: "Trade acceptance not found" });
      }
      
      const trade = await storage.getEnergyTradeById(acceptance.tradeId);
      if (!trade) {
        return res.status(404).json({ error: "Trade not found" });
      }
      
      // Verify user owns the trade
      const userHouseholds = await storage.getHouseholdsByUser(req.user!.id);
      const userHouseholdIds = userHouseholds.map(h => h.id);
      const ownsThisTrade = (trade.sellerHouseholdId && userHouseholdIds.includes(trade.sellerHouseholdId)) ||
                           (trade.buyerHouseholdId && userHouseholdIds.includes(trade.buyerHouseholdId));
      
      if (!ownsThisTrade) {
        return res.status(403).json({ error: "You can only make decisions on your own trades" });
      }
      
      // Only allow decisions when status is 'applied'
      if (acceptance.status !== 'applied') {
        return res.status(400).json({ error: "Can only make decisions on applications in 'applied' status" });
      }
      
      if (decision === 'accept') {
        // Update acceptance status to 'awarded' (aligns with contact sharing workflow)
        const updatedAcceptance = await storage.updateTradeAcceptanceStatus(acceptanceId, 'awarded');
        // Update trade status to 'accepted' (closes further applications)
        await storage.updateEnergyTradeStatus(acceptance.tradeId, 'accepted');
        
        // Send email notification to applicant
        try {
          const applicantUser = await storage.getUser(acceptance.acceptorUserId);
          const applicantHouseholds = await storage.getHouseholdsByUser(acceptance.acceptorUserId);
          const applicantHousehold = applicantHouseholds.find(h => h.id === acceptance.acceptorHouseholdId);
          
          if (applicantUser) {
            await emailService.sendApplicationApprovalNotification(
              applicantUser,
              req.user!,
              trade,
              applicantHousehold
            );
          }
        } catch (emailError) {
          console.warn('Failed to send approval email notification:', emailError);
          // Don't fail the entire operation if email fails
        }
        
        res.json({
          success: true,
          acceptance: updatedAcceptance,
          message: "Application accepted! You can now share contact information for energy delivery coordination."
        });
      } else {
        // Update acceptance status to 'owner_rejected'
        const updatedAcceptance = await storage.updateTradeAcceptanceStatus(acceptanceId, 'owner_rejected');
        // Keep trade status as 'pending' so owner can choose another applicant
        
        res.json({
          success: true,
          acceptance: updatedAcceptance,
          message: "Application rejected. Trade remains available for other applicants."
        });
      }
    } catch (error) {
      console.error('Failed to process owner decision:', error);
      res.status(500).json({ error: "Failed to process decision" });
    }
  });

  // Applicant reject (after owner accepted)
  app.patch("/api/trade-acceptances/:id/applicant-reject", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const acceptanceId = parseInt(req.params.id);
      
      // Verify the acceptance belongs to the current user
      const userAcceptances = await storage.getTradeAcceptancesByUser(req.user!.id);
      const acceptance = userAcceptances.find(a => a.id === acceptanceId);
      
      if (!acceptance) {
        return res.status(404).json({ error: "Trade acceptance not found or access denied" });
      }
      
      // Only allow rejection when status is 'awarded'
      if (acceptance.status !== 'awarded') {
        return res.status(400).json({ error: "Can only reject applications that have been awarded by owner" });
      }
      
      // Update acceptance status to 'applicant_rejected'
      const updatedAcceptance = await storage.updateTradeAcceptanceStatus(acceptanceId, 'applicant_rejected');
      
      // Revert trade status to 'pending' so owner can choose another applicant
      await storage.updateEnergyTradeStatus(acceptance.tradeId, 'pending');
      
      res.json({
        success: true,
        acceptance: updatedAcceptance,
        message: "Application rejected. Trade is now available for the owner to choose another applicant."
      });
    } catch (error) {
      console.error('Failed to reject application:', error);
      res.status(500).json({ error: "Failed to reject application" });
    }
  });

  // Test email notification endpoint
  app.post("/api/test-email", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { email } = req.body;
      const testEmail = email || req.user!.email;
      
      const success = await emailService.sendTestEmail(testEmail);
      
      if (success) {
        res.json({ 
          success: true, 
          message: `Test email sent successfully to ${testEmail}` 
        });
      } else {
        res.status(500).json({ 
          error: "Email service not configured. Please set EMAIL_USER and EMAIL_PASSWORD environment variables." 
        });
      }
    } catch (error) {
      console.error('Failed to send test email:', error);
      res.status(500).json({ error: "Failed to send test email" });
    }
  });
}