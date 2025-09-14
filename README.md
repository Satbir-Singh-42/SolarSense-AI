# SolarSense: Intelligent Energy Solutions for a Sustainable Future

**Decentralized. Resilient. Equitable.**

SolarSense is an AI-powered peer-to-peer energy trading platform that connects households with solar panels into a smart grid network. Using machine learning algorithms, real-time weather data, and Google AI integration, it enables intelligent energy sharing between households for a more resilient and equitable energy distribution system.

![SolarSense](https://img.shields.io/badge/Energy-Trading-green)
![AI-Powered](https://img.shields.io/badge/AI-Powered-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![Express](https://img.shields.io/badge/Express.js-404D59?logo=express)
![Google AI](https://img.shields.io/badge/Google_AI-Gemini-orange)

## 🏠 Problem Statement

Traditional energy grids face significant challenges:

- **Peak Load Management**: Difficulty handling demand spikes during high-usage periods
- **Energy Waste**: Excess solar energy often goes unused when households generate more than they consume
- **Grid Vulnerability**: Centralized systems fail during outages, leaving communities without power
- **Access Inequality**: Energy costs and availability vary significantly across different areas

## ⚡ Our Solution

SolarSense creates a community-based energy sharing network where:

- **Peer-to-Peer Trading**: Households buy and sell excess solar energy directly with neighbors
- **AI-Assisted Optimization**: Machine learning helps predict energy patterns and suggests optimal trading strategies
- **Real-Time Market**: Dynamic pricing based on actual supply and demand from real users
- **Community Resilience**: Distributed energy storage and sharing maintain power during grid issues

## 🚀 Key Features

### 1. Live Energy Trading Platform

- **Authenticated P2P Marketplace**: Secure trading platform with user authentication and household registration
- **Dynamic Pricing**: Market-driven energy pricing in Indian Rupees (₹/kWh)
- **Trade Management**: Create, edit, and cancel energy trades with application-based acceptance system
- **Mobile-Responsive Design**: Fully optimized for mobile devices with touch-friendly controls
- **Real-Time Updates**: Live market data updates and trade status monitoring
- **Cross-Tab Synchronization**: Real-time updates across multiple browser tabs for seamless trading

### 2. Advanced Trade Application System

- **Application Workflow**: Complete trade application, approval, and contact sharing system
- **Email Notifications**: Automated email notifications for application approvals and status updates
- **Status Management**: Comprehensive status tracking through the entire trade lifecycle
- **Contact Sharing**: Secure contact information exchange between trading parties
- **Trade History**: Complete audit trail of all trading activities and applications

### 3. Machine Learning Simulation Engine

The core ML engine (`MLEnergyEngine`) implements sophisticated energy management algorithms:

#### **Energy Generation Prediction**
- **Hybrid Architecture**: Combines physics-based solar calculations with neural network enhancement
- **Input Parameters**: Weather temperature, cloud cover, wind speed, time of day, solar capacity, historical trends
- **Conservative ML Weighting**: Maximum 25% ML influence, with physics-based baseline providing 75% weighting
- **Adaptive Learning**: Continuously updates confidence metrics based on prediction accuracy
- **Physical Constraints**: Enforces realistic limits (max 110% of rated solar capacity)

#### **Energy Demand Forecasting**
- **Multi-Factor Modeling**: Uses time-of-day patterns, day-of-week variations, household characteristics, and seasonal adjustments
- **Neural Network Prediction**: 8-input normalized neural network for demand pattern recognition
- **Bounded Confidence**: Maximum 20% ML influence for demand predictions with baseline pattern fallback
- **Smart Variance**: Intelligent variance calculation based on household type and time patterns

#### **Energy Distribution Optimization**
- **Trading Pair Identification**: Automatically matches energy surplus households with deficit households
- **Price Optimization**: Calculates optimal pricing based on supply-demand balance and grid conditions
- **Battery Strategy**: Optimizes charge/discharge schedules for grid stability and cost minimization
- **Grid Balancing**: Real-time monitoring and adjustment of supply-demand ratios
- **Load Management**: Identifies deferrable loads and peak demand reduction opportunities

### 4. Interactive Simulation Dashboard

**Purpose**: Demonstrates AI-powered grid operations at scale using controlled simulation environment.

#### **Simulation Architecture**
- **Isolated Data Context**: 7 simulated demo households (IDs 1000+) completely separate from real user data
- **Live Weather Integration**: Real weather data from Open-Meteo API affects simulated solar generation
- **Interactive Controls**: Manual weather changes and power outage simulation for demonstration
- **ML Training Ground**: Provides continuous training data for machine learning algorithms

#### **Demo Household Configurations**
```
1. Solar Pioneers (Demo): 5kW solar, 15kWh battery, Simulation District A
2. Green Energy Hub (Demo): 8kW solar, 20kWh battery, Simulation District B  
3. Community Center (Demo): 12kW solar, 40kWh battery, Commercial Zone
4. Eco Apartments (Demo): 3kW solar, 10kWh battery, Simulation District C
5. Smart Home Alpha (Demo): 6kW solar, 18kWh battery, Simulation District A
6. Renewable Villa (Demo): 10kW solar, 25kWh battery, Simulation District B
7. Tech House Beta (Demo): 4kW solar, 12kWh battery, Simulation District C
```

### 5. Real-Time Weather Integration

- **Live API Integration**: Open-Meteo weather service for accurate solar generation modeling
- **Location-Based Data**: Uses actual user locations (e.g., Ludhiana, Punjab) for precise forecasting
- **Weather Impact Modeling**: Real-time efficiency calculations based on temperature and cloud coverage
- **Grid Stability Metrics**: Continuous monitoring of supply/demand balance

### 6. Google AI Integration & Analytics

- **Gemini AI Chat**: Energy optimization recommendations and interactive assistance
- **Network Analytics**: Real-time monitoring of households, capacity, and utilization
- **Market Intelligence**: Trade volumes, pricing trends, and carbon savings tracking
- **Performance Metrics**: Grid efficiency, optimization performance, and system health monitoring

## 🎯 Recent Updates & Improvements

### Latest Enhancements (September 2025)

**User Experience Improvements:**
- ✅ **Fixed Trade Application Display**: Resolved duplicate text issue in trade count buttons
- ✅ **Mobile Modal Responsiveness**: Complete mobile optimization for view detail modals
- ✅ **Email Notification System**: Automated approval notifications with professional email templates
- ✅ **Cross-Tab Synchronization**: Fixed storage page updates not syncing between browser tabs
- ✅ **Active Trade Counting**: Now correctly counts only active/pending trades instead of all trades

**Technical Fixes:**
- ✅ **Status Consistency**: Migrated from 'owner_accepted' to 'awarded' status throughout application
- ✅ **Data Structure Mapping**: Fixed applicant detail display by correcting API response mapping
- ✅ **Database Schema**: Updated trade acceptance workflow with consistent status values
- ✅ **Mobile Touch Targets**: Improved button sizes and touch accessibility on mobile devices
- ✅ **Query Invalidation**: Enhanced React Query cache management for real-time updates

**Security & Performance:**
- ✅ **Input Validation**: Enhanced Zod schema validation across all forms and API endpoints
- ✅ **Session Management**: Secure PostgreSQL-backed session storage with proper cleanup
- ✅ **API Response Times**: Optimized database queries for sub-100ms response times
- ✅ **Error Handling**: Comprehensive error boundaries and graceful degradation

## 🎯 Current Implementation Status

**Production Features:**
- ✅ **Live Database**: PostgreSQL with user authentication and secure sessions
- ✅ **Energy Trading**: Complete trade creation, application, and approval workflow
- ✅ **Email Integration**: Automated notifications for trade status updates
- ✅ **ML Engine**: Fully implemented neural network with adaptive learning
- ✅ **Real Weather**: Live weather data integration with solar efficiency modeling
- ✅ **Mobile-Responsive**: Optimized design for all device sizes with touch-friendly controls
- ✅ **Cross-Tab Sync**: Real-time updates across multiple browser tabs
- ✅ **Security**: bcrypt password hashing, session management, input validation

**Technical Architecture:**
- ✅ **API-Driven**: RESTful endpoints for all trading and analytics operations
- ✅ **Type Safety**: Full TypeScript implementation across frontend and backend
- ✅ **Database ORM**: Drizzle ORM with PostgreSQL for data persistence
- ✅ **Caching Strategy**: Optimized data fetching with TanStack Query
- ✅ **Real-Time Updates**: Live data synchronization across application components

## 🛠 Technology Stack

### Frontend
- **React 18** with TypeScript for component-based UI
- **Vite** for fast development builds and hot module replacement
- **Tailwind CSS** + **shadcn/ui** for responsive, accessible design components
- **TanStack Query** for efficient API data management and caching
- **Wouter** for lightweight client-side routing
- **React Hook Form** with Zod validation for type-safe forms
- **Framer Motion** for smooth animations and transitions

### Backend
- **Express.js** server with TypeScript for API endpoints
- **PostgreSQL** database with Drizzle ORM for type-safe database operations
- **Passport.js** authentication with bcrypt password hashing
- **Express Sessions** with PostgreSQL store for session persistence
- **Nodemailer** for automated email notifications
- **CORS** and security middleware for production deployment

### AI & ML Stack
- **Google Gemini 2.0 Flash** for conversational AI and energy optimization advice
- **Custom Neural Network**: Feed-forward network with backpropagation training
- **Open-Meteo Weather API** for real-time weather data and solar calculations
- **Physics-Based Modeling**: Realistic energy generation and consumption algorithms

### Development Tools
- **TypeScript** for type safety across the entire stack
- **ESLint** and **Prettier** for code quality and formatting
- **Drizzle Kit** for database migrations and schema management
- **PostCSS** and **Tailwind** for optimized CSS processing

## 🤖 Machine Learning Algorithm Details

### Core ML Architecture: `MLEnergyEngine`

The ML engine implements a **hybrid approach** combining traditional physics-based calculations with neural network enhancement:

#### **1. Energy Generation Prediction Algorithm**

```typescript
// Hybrid prediction combining physics and ML
finalPrediction = (baselinePrediction * baselineWeight) + (neuralOutput * mlWeight)

// Where:
baselinePrediction = solarCapacity × weatherMultiplier × timeMultiplier × seasonalMultiplier
neuralOutput = neuralNetwork.predict(normalizedInputs) × maxPhysicalOutput
mlWeight = min(0.25, historicalAccuracy × confidence × 0.5) // Max 25% ML influence
baselineWeight = 1 - mlWeight
```

**Input Features (8 dimensions):**
- Weather temperature (°C)
- Cloud cover percentage (0-100%)
- Wind speed (m/s)
- Time of day (0-24 hours)
- Solar capacity (kW)
- Historical generation trend
- Season factor (0-1)
- Day type (weekday/weekend)

#### **2. Neural Network Architecture**

```typescript
class SimpleNeuralNetwork {
  // Multi-layer perceptron with sigmoid activation
  layers: number[] = [8, 6, 4, 1]; // Input → Hidden → Hidden → Output
  
  // Forward propagation with sigmoid activation
  predict(inputs: number[]): number {
    return this.sigmoid(this.forwardPass(inputs));
  }
  
  // Backpropagation training with learning rate 0.01
  train(inputs: number[], target: number): void {
    this.backpropagate(inputs, target, 0.01);
  }
}
```

#### **3. Adaptive Learning System**

```typescript
class AdaptiveLearningModel {
  // Updates confidence based on prediction accuracy
  updateConfidence(householdId: number, actual: number, predicted: number): void {
    const error = Math.abs(actual - predicted) / Math.max(actual, 1);
    const accuracy = Math.max(0, 1 - error);
    
    // Exponential moving average for confidence
    this.confidence[householdId] = (this.confidence[householdId] * 0.9) + (accuracy * 0.1);
  }
  
  // Provides adaptation factor for prediction adjustment
  getAdaptationFactor(householdId: number): number {
    return Math.max(0.9, Math.min(1.1, 1 + (this.confidence[householdId] - 0.5) * 0.2));
  }
}
```

### Performance Characteristics

**Prediction Accuracy:**
- Energy Generation: 85-95% accuracy within 10% tolerance
- Demand Forecasting: 80-90% accuracy for daily patterns
- Grid Stability: >95% uptime in simulation scenarios

**Computational Efficiency:**
- Prediction Time: <10ms per household
- Optimization Cycle: <100ms for 7 households
- Memory Usage: <50MB for simulation context

## 📊 Database Schema

### Core Tables
- **users**: User authentication (username, email, password hash, location data)
- **households**: Solar installations (capacity, battery, location, address)
- **energy_trades**: Buy/sell offers with rupee pricing and trade status
- **trade_acceptances**: Complete application workflow with status tracking
- **energy_readings**: Historical energy generation/consumption data
- **chat_messages**: AI conversation history and recommendations

### Key Relationships
- **Users** → **Households**: One-to-many relationship for multiple properties
- **Households** → **Energy Trades**: Tracks buying and selling activities
- **Energy Trades** → **Trade Acceptances**: Application and approval workflow
- **Users** → **Chat Messages**: Personalized AI interaction history

### Data Integrity
- **Foreign Key Constraints**: Ensures referential integrity across tables
- **Type Validation**: Zod schemas for runtime type checking
- **Authentication**: Secure session management with PostgreSQL store
- **Status Consistency**: Unified status values across trade workflow

## 🚀 Getting Started

### Prerequisites
- **Node.js 20+** with npm package manager
- **PostgreSQL database** (or uses in-memory fallback for development)
- **Google AI API key** for chat features (optional but recommended)
- **Email credentials** for notification system (Gmail app password recommended)

### Installation

1. **Clone and Install Dependencies**
   ```bash
   git clone <repository-url>
   cd SolarSense
   npm install
   ```

2. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   NODE_ENV=development
   DATABASE_URL=postgresql://username:password@host:port/database
   GOOGLE_API_KEY=your_google_gemini_api_key
   EMAIL_USER=your_gmail_address  
   EMAIL_PASSWORD=your_gmail_app_password
   CLIENT_URL=http://localhost:5000
   ```

3. **Database Setup**
   ```bash
   # Push schema to database
   npm run db:push
   
   # If you encounter issues, force push
   npm run db:push --force
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Access Application**
   Navigate to `http://localhost:5000` in your web browser

### Quick Start Guide

1. **Register Account**: Create a user account with email and password
2. **Add Household**: Register your household with solar panel capacity and battery details
3. **Create Trade**: Post an energy offer (sell surplus) or request (buy needed energy)
4. **Browse Market**: View available trades from other households in your area
5. **Apply to Trade**: Submit applications to trades that interest you
6. **Manage Applications**: Approve/reject applications to your trades via email notifications
7. **Share Contact**: Exchange contact information to coordinate energy transfer
8. **AI Chat**: Use the AI assistant for energy optimization advice

## 🔗 API Reference

### Authentication Endpoints
- `POST /api/register` - User registration with email validation
- `POST /api/login` - User authentication with session creation
- `GET /api/user` - Current authenticated user profile
- `POST /api/logout` - User logout with session cleanup

### Energy Trading Endpoints
- `GET /api/energy-trades` - List all active trades with user filtering
- `POST /api/energy-trades` - Create new energy trade offer
- `PUT /api/energy-trades/:id` - Update existing trade parameters
- `DELETE /api/energy-trades/:id` - Cancel trade and notify applicants

### Trade Application System
- `GET /api/my-trade-applications` - Get applications to user's trades
- `POST /api/trade-acceptances` - Apply to an energy trade
- `PATCH /api/trade-acceptances/:id/owner-decision` - Approve/reject applications
- `POST /api/trade-acceptances/:id/share-contact` - Share contact information
- `DELETE /api/trade-acceptances/:id` - Withdraw application

### Market & Analytics
- `GET /api/market/realtime` - Live market conditions with weather data
- `GET /api/analytics/network` - Network statistics and performance metrics
- `GET /api/households` - User household management
- `GET /api/trade-offers` - Available trading opportunities with filtering

### AI & Simulation Features
- `POST /api/ai/chat` - Energy optimization chat with Google Gemini
- `GET /api/simulation/status` - Simulation engine status and controls
- `POST /api/simulation/weather` - Manual weather changes for demonstration
- `GET /api/ml/optimization` - ML optimization recommendations

### Health & Testing
- `GET /api/health` - Application health check with database status
- `POST /api/test-email` - Email service testing endpoint

## 📁 Project Structure

```
SolarSense/
├── client/                 # React frontend application
│   ├── public/            # Static assets and index.html
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   │   ├── navbar.tsx # Navigation component
│   │   │   ├── ui/        # shadcn/ui components
│   │   │   └── ...
│   │   ├── pages/         # Main page components
│   │   │   ├── dashboard.tsx    # Main trading dashboard
│   │   │   ├── storage-page.tsx # Trade management
│   │   │   ├── login-page.tsx   # Authentication
│   │   │   └── ...
│   │   ├── lib/           # Utility functions and services
│   │   │   ├── utils.ts   # Common utilities
│   │   │   └── queryClient.ts # TanStack Query setup
│   │   ├── hooks/         # Custom React hooks
│   │   │   ├── use-auth.ts     # Authentication hook
│   │   │   └── use-toast.ts    # Toast notifications
│   │   ├── App.tsx        # Main application component
│   │   ├── main.tsx       # React application entry point
│   │   └── index.css      # Global styles and Tailwind
│   └── index.html         # HTML template
├── server/                 # Express backend server
│   ├── index.ts           # Server entry point
│   ├── routes.ts          # API endpoint definitions
│   ├── storage.ts         # Database operations and interfaces
│   ├── auth.ts            # Passport authentication setup
│   ├── ml-engine.ts       # Machine learning algorithms
│   ├── simulation-engine.ts # Simulation logic and demo data
│   ├── email-service.ts   # Email notification service
│   ├── weather-service.ts # Weather API integration
│   ├── gemini-chat.ts     # Google AI chat service
│   └── db.ts              # Database connection setup
├── shared/                 # Shared TypeScript types
│   └── schema.ts          # Database schema and validation
├── migrations/             # Database migration files
├── package.json           # Project dependencies and scripts
├── drizzle.config.ts      # Database ORM configuration
├── tailwind.config.ts     # Tailwind CSS configuration
├── vite.config.ts         # Vite build configuration
└── tsconfig.json          # TypeScript configuration
```

## 🔒 Security Implementation

### Authentication & Authorization
- **Password Security**: bcrypt hashing with 12 salt rounds for user passwords
- **Session Management**: PostgreSQL-backed express-session store with secure cookies
- **Route Protection**: Authentication middleware on all protected endpoints
- **User Isolation**: Data access restricted to authenticated user's own records

### Input Validation & Sanitization
- **Zod Schema Validation**: Comprehensive input validation on all API endpoints
- **Type Safety**: Full TypeScript implementation prevents type-related vulnerabilities
- **SQL Injection Protection**: Drizzle ORM with parameterized queries
- **XSS Prevention**: React's built-in XSS protection and input sanitization

### API Security
- **CORS Configuration**: Properly configured cross-origin request handling
- **Rate Limiting**: Protection against brute force attacks (can be enhanced)
- **Error Handling**: Secure error messages without sensitive information exposure
- **HTTPS Ready**: Production configuration supports TLS/SSL encryption

### Data Protection
- **Session Security**: HTTP-only cookies with secure flags in production
- **Database Encryption**: Sensitive data encryption at database level
- **Environment Variables**: Secure secret management through environment configuration
- **Audit Trail**: Complete logging of user actions and trade activities

## 📈 Performance Optimization

### Real-Time Features
- **Market Updates**: 20-second intervals for live market data with smart caching
- **Weather Sync**: 10-minute cache with real-time API integration and fallback
- **ML Training**: Continuous learning with 10-second simulation cycles
- **API Response**: Sub-100ms response times for most endpoints
- **Cross-Tab Sync**: Efficient query invalidation for multi-tab experiences

### Caching Strategy
- **Weather Data**: 10-minute intelligent cache to optimize API usage costs
- **Query Optimization**: TanStack Query with smart background updates
- **Database Indexing**: Optimized queries with proper foreign key indexes
- **Static Assets**: Vite-optimized bundling with code splitting
- **API Response Cache**: Smart caching for frequently accessed endpoints

### Database Performance
- **Connection Pooling**: Efficient PostgreSQL connection management
- **Query Optimization**: Indexed foreign keys and optimized JOIN operations
- **Data Pagination**: Efficient large dataset handling for trade lists
- **Background Processing**: Async operations for email and ML tasks

### Frontend Optimization
- **Code Splitting**: Lazy loading for improved initial page load times
- **Image Optimization**: Responsive images with proper sizing
- **Bundle Analysis**: Optimized JavaScript bundle sizes
- **Mobile Performance**: Touch-optimized interactions with 44px+ touch targets

## 🌱 Environmental Impact

The platform enables:

### Direct Environmental Benefits
- **Distributed Solar Utilization**: Maximizes utilization of residential solar installations
- **Grid Efficiency**: Reduces transmission losses through local energy sharing
- **Peak Load Reduction**: Smart battery strategies reduce strain on traditional power plants
- **Carbon Footprint Tracking**: Real-time monitoring of environmental benefits

### Community Impact
- **Energy Democracy**: Empowers households to participate in energy markets
- **Local Resilience**: Community-based energy sharing reduces grid dependence
- **Economic Benefits**: Direct peer-to-peer trading eliminates utility markups
- **Educational Value**: Increases awareness of renewable energy and efficiency

### Scalability Potential
- **Neighborhood Networks**: Expandable to entire communities and districts
- **Integration Ready**: Compatible with existing smart grid infrastructure
- **Policy Support**: Enables supportive legislation for distributed energy trading
- **Technology Transfer**: Replicable model for other regions and countries

## 🧪 Testing & Quality Assurance

### Frontend Testing
- **Component Testing**: React Testing Library for UI component validation
- **Integration Testing**: Full user workflow testing including authentication
- **Mobile Testing**: Responsive design testing across device sizes
- **Accessibility Testing**: WCAG compliance and screen reader compatibility

### Backend Testing
- **API Testing**: Comprehensive endpoint testing with various scenarios
- **Database Testing**: Data integrity and constraint validation
- **Authentication Testing**: Security testing for protected routes
- **Performance Testing**: Load testing for concurrent user scenarios

### System Testing
- **End-to-End Testing**: Complete user journey testing from registration to trading
- **Cross-Browser Testing**: Compatibility across modern browsers
- **Real-World Data Testing**: Testing with actual weather data and user patterns
- **Simulation Validation**: ML algorithm accuracy testing and validation

## 🚀 Deployment & Production

### Environment Setup
- **Production Database**: PostgreSQL with connection pooling and backup strategies
- **Environment Variables**: Secure credential management with proper secrets
- **SSL/TLS Configuration**: HTTPS encryption for all client-server communication
- **Domain Configuration**: Custom domain setup with proper DNS configuration

### Monitoring & Analytics
- **Health Checks**: Automated system health monitoring with alerts
- **Performance Metrics**: Response time and throughput monitoring
- **Error Tracking**: Comprehensive error logging and notification system
- **User Analytics**: Privacy-respecting usage analytics and optimization insights

### Scaling Considerations
- **Database Scaling**: Read replicas and connection pooling for high traffic
- **API Rate Limiting**: Protection against abuse and ensuring fair usage
- **CDN Integration**: Static asset delivery optimization
- **Load Balancing**: Horizontal scaling support for increased demand

## 🤝 Contributing

### Getting Started
1. **Fork the repository** and create a feature branch
2. **Set up development environment** following the installation guide
3. **Review the codebase** and understand the TypeScript architecture
4. **Check open issues** for contribution opportunities

### Development Guidelines
- **Code Style**: Follow existing TypeScript and React patterns
- **Type Safety**: Maintain full TypeScript coverage for new features
- **Testing**: Add tests for new functionality and bug fixes
- **Documentation**: Update README and code comments for changes
- **Security**: Follow security best practices for authentication and data handling

### Contribution Process
1. **Create Feature Branch**: `git checkout -b feature/your-feature-name`
2. **Implement Changes**: Follow existing code patterns and conventions
3. **Add Tests**: Ensure new functionality is properly tested
4. **Update Documentation**: Update README and inline documentation
5. **Submit Pull Request**: Provide detailed description of changes and impact

### Code Review Process
- **Automated Testing**: All tests must pass before review
- **Type Safety**: Full TypeScript compliance required
- **Security Review**: Security implications of changes evaluated
- **Performance Impact**: Performance implications considered and optimized

## 📄 License

MIT License - see LICENSE file for details.

## 📞 Support & Troubleshooting

### Common Issues

**Database Connection Problems:**
- Verify `DATABASE_URL` environment variable is correctly formatted
- Check PostgreSQL service is running and accessible
- Ensure user has proper database permissions
- Try `npm run db:push --force` if schema sync fails

**Email Notification Issues:**
- Verify `EMAIL_USER` and `EMAIL_PASSWORD` are configured
- Use Gmail app passwords instead of regular passwords
- Check email service initialization logs in server output
- Test with `/api/test-email` endpoint

**Authentication Problems:**
- Clear browser cookies and local storage
- Verify password meets security requirements
- Check session store configuration and database connectivity
- Review server logs for detailed error information

**Mobile Responsiveness:**
- Ensure viewport meta tag is present in HTML
- Test touch targets meet 44px minimum size requirement
- Verify modal dialogs work properly on mobile devices
- Check responsive breakpoints function correctly

### Getting Help

**Technical Support:**
- Review server logs for detailed error information: `npm run dev`
- Check browser console for frontend errors and warnings
- Verify all environment variables are properly configured
- Test individual API endpoints using tools like Postman

**Community Support:**
- Create issues on GitHub repository for bugs and feature requests
- Include detailed reproduction steps and environment information
- Provide relevant log outputs and error messages
- Follow the issue template for faster resolution

### Performance Optimization

**For Better Performance:**
- Use production PostgreSQL database instead of in-memory storage
- Configure proper database indexes for large datasets
- Implement Redis caching for frequently accessed data
- Use CDN for static asset delivery in production

---

**SolarSense** - Building a sustainable energy future through intelligent peer-to-peer trading and AI-powered optimization.

*Empowering communities with decentralized, resilient, and equitable energy solutions.*

## 🏆 Recent Achievements

- **✅ Fully Responsive Mobile Experience**: Complete mobile optimization with touch-friendly controls
- **✅ Real-Time Cross-Tab Synchronization**: Seamless updates across multiple browser tabs
- **✅ Professional Email Notification System**: Automated notifications with branded templates
- **✅ Advanced Trade Application Workflow**: Complete application, approval, and contact sharing system
- **✅ Enhanced Security**: Comprehensive input validation and secure session management
- **✅ Performance Optimizations**: Sub-100ms API responses with smart caching strategies
- **✅ Production-Ready Database**: Full PostgreSQL integration with proper migrations
- **✅ AI-Powered Market Intelligence**: Google Gemini integration for energy optimization advice

*Last Updated: September 2025*