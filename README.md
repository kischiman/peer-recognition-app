# Peer Recognition App

A collaborative peer recognition application inspired by Coordinape, built with Next.js, React, and TypeScript. This app enables teams to recognize each other's contributions and distribute points to show appreciation for valuable work.

## Features

### 🎯 **Core Workflow**
1. **Chapter Setup**: Admins create recognition chapters with participants and deadlines
2. **Contribution Phase**: Team members write about each other's contributions
3. **Distribution Phase**: Participants allocate 100 points across all contributions
4. **Results Dashboard**: View aggregated results and insights

### ⚡ **Key Capabilities**
- **Multi-Chapter Support**: Run multiple recognition cycles simultaneously
- **Deadline-Based Timing**: Set specific deadlines for contribution and distribution phases
- **Multiple Contributions**: Support multiple contributions per team member
- **Real-Time Countdowns**: Live countdown timers with automatic phase transitions
- **Participant Management**: Add/remove participants during active chapters
- **Results Analytics**: Comprehensive dashboard with charts and insights

### 🔧 **Admin Features**
- Create and manage recognition chapters
- Set contribution and distribution deadlines
- Control chapter phases (Setup → Contribution → Distribution → Finished)
- Add/remove participants from existing chapters
- Delete chapters with confirmation
- View comprehensive results

### 👥 **Participant Features**
- Join active chapters with simple name selection
- Write detailed contributions about team members
- Distribute 100 points across all contributions
- View session workflow and remaining time
- Access results dashboard

### Technical Features
- Real-time updates and auto-save functionality
- Clean, minimalist UI with card-based layout
- Interactive bar charts and statistics
- Simple JSON-based local persistence
- Mobile-responsive design

## Tech Stack

- **Frontend**: React 18, Next.js 14, TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Backend**: Next.js API Routes
- **Database**: JSON file storage
- **State Management**: React hooks with auto-refresh

## Project Structure

```
peer-recognition-app/
├── components/           # React components
│   ├── AdminPanel.tsx   # Epoch creation and management
│   ├── ParticipantLogin.tsx  # Name-based authentication
│   ├── CircleView.tsx   # Contribution viewing and commenting
│   ├── DistributionView.tsx  # Point distribution interface
│   └── ResultsDashboard.tsx  # Results visualization
├── pages/
│   ├── api/             # Backend API endpoints
│   │   ├── epochs/      # Epoch management
│   │   ├── contributions/  # Contribution CRUD
│   │   ├── comments/    # Comment system
│   │   └── distributions/  # Point distribution
│   ├── index.tsx        # Main application
│   └── results.tsx      # Dedicated results page
├── lib/
│   └── database.ts      # Database operations and types
├── data/
│   └── database.json    # JSON data store
└── styles/
    └── globals.css      # Global styles and Tailwind imports
```

## API Endpoints

### Epoch Management
- `POST /api/epochs` - Create new epoch
- `GET /api/epochs` - Get active epoch
- `PUT /api/epochs/[id]/status` - Update epoch status
- `GET /api/epochs/[id]/participants` - Get epoch participants

### Contributions
- `POST /api/contributions` - Create contribution
- `GET /api/contributions?epochId=[id]` - Get epoch contributions

### Comments
- `POST /api/comments` - Add comment
- `GET /api/comments?contributionId=[id]` - Get contribution comments

### Point Distribution
- `POST /api/distributions` - Distribute points
- `GET /api/distributions?epochId=[id]` - Get all distributions
- `GET /api/distributions?epochId=[id]&participantId=[id]` - Get participant's distributions

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone and navigate to the project**:
   ```bash
   cd peer-recognition-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up database (optional - for persistent storage)**:
   - **Option A: Upstash Redis (recommended for production)**:
     1. Create account at [Upstash](https://upstash.com/)
     2. Create a new Redis database
     3. Copy `.env.example` to `.env.local`
     4. Add your Upstash credentials:
        ```bash
        UPSTASH_REDIS_REST_URL=your_upstash_redis_url
        UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
        ```
   - **Option B: Local development**: No setup needed - uses JSON file storage

4. **Start the development server**:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

### Usage

#### For Administrators:
1. Click "Admin" in the top navigation
2. Create a new epoch with title, duration (1h-2 days), and participant names
3. Start the contribution phase when ready
4. Progress through distribution phase and finish the epoch
5. View results dashboard

#### For Participants:
1. Select your name from the dropdown to join the circle
2. **Contribution Phase**: Add your contributions for the epoch period
3. **Comment Phase**: View others' contributions and add praise/comments
4. **Distribution Phase**: Allocate your 100 points across team members' contributions
5. **Results**: View final recognition results and statistics

## Key Features Detail

### Epoch Phases
1. **Setup**: Admin creates epoch and adds participants
2. **Contribution**: Participants document their work
3. **Distribution**: Points are allocated (max 100 per person)
4. **Finished**: Results dashboard shows recognition outcomes

### Point Distribution Logic
- Each participant has exactly 100 points to distribute
- Points can be allocated in any increment (1, 5, 10, etc.)
- Real-time validation prevents over-allocation
- Total points calculation: `∑(Points_Received)` per participant

### Data Persistence
All data is stored in `data/database.json` with the following structure:
- **epochs**: Epoch metadata and status
- **participants**: Participant-to-epoch relationships  
- **contributions**: User-submitted work descriptions
- **comments**: Peer feedback and praise
- **distributions**: Point allocation records

## Development

### Building for Production
```bash
npm run build
npm start
```

### Code Style
The project uses ESLint with Next.js configuration and TypeScript for type safety.

### State Management
- React hooks for local state
- Auto-refresh every 5-10 seconds for real-time updates
- Form state persisted to backend on save

## Customization

### Modifying Point Budget
Change the `TOTAL_POINTS` constant in `DistributionView.tsx` (default: 100)

### Duration Options  
Modify the duration dropdown in `AdminPanel.tsx` to add more time options

### Styling
All styles use Tailwind CSS classes. Customize the theme in `tailwind.config.js`

## Troubleshooting

### Common Issues
1. **Empty participant dropdown**: Ensure an epoch is created in admin panel
2. **Points not saving**: Check browser console for API errors
3. **Charts not loading**: Verify Recharts dependency installation

### Data Reset
To reset all data, delete the contents of `data/database.json` and restart the server.

## License

MIT License - feel free to use and modify for your needs.