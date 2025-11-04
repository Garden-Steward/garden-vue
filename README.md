# Garden Steward

A community-driven, open-source Vue.js application for managing volunteer events, watering schedules, and harvest coordination in communal gardens. Since 2022, Garden Steward has partnered with the Oakland Urban Farming Project (OUFP) to foster urban agriculture through SMS-first software.

## About

Garden Steward is an SMS-based application designed to make it easier to create and manage publicly accessible gardens with abundant and foragable plants. The platform enables volunteers to coordinate tasks, manage events, and stay connected with their garden communities through SMS messaging.

## Features

- 🌱 **Garden Management**: Create and manage multiple garden projects
- 📅 **Event Coordination**: Organize volunteer days and track RSVPs
- 📱 **SMS Integration**: SMS-first approach for task management and communication
- 👥 **Volunteer Management**: Track volunteers, assign tasks, and manage schedules
- 📝 **Task Management**: Create, assign, and track garden tasks
- 📍 **Location Tracking**: Map and track garden locations
- 📰 **Blog System**: Share garden stories and updates
- 🗓️ **Week Scheduler**: Plan and schedule recurring garden activities

## Tech Stack

- **Frontend Framework**: Vue 3 (Composition API)
- **State Management**: Pinia
- **Routing**: Vue Router 4
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: 
  - TipTap (rich text editor)
  - Leaflet (maps)
  - Vue DatePicker
  - Font Awesome
- **Form Validation**: Vee-Validate with Yup
- **Deployment**: Firebase Hosting

## Prerequisites

- Node.js 18+ (recommended)
- npm or yarn
- Firebase CLI (for deployment)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/garden-vue.git
cd garden-vue
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env` file in the root directory:
```env
VITE_API_URL=your-steward-bank-api
```

4. Start the development server:
```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:3030`

## Configuration

### Environment Variables

Create a `.env` file (or `.env.local` for local development) with the following variables:

- `VITE_API_URL`: The base URL for your backend API

Example:
```env
VITE_API_URL=http://localhost:1337
```

Note: `.env` files are excluded from version control for security.

### Firebase Configuration

The project is configured for Firebase Hosting. Update `firebase.json` with your Firebase project settings if needed.

## Available Scripts

- `npm run dev` - Start development server
- `npm run dev:prod` - Start development server in production mode
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npm run deploy` - Build and deploy to Firebase

## Project Structure

```
garden-vue/
├── src/
│   ├── components/      # Vue components
│   │   ├── auth/        # Authentication components
│   │   ├── form/        # Form components
│   │   └── modals/      # Modal components
│   ├── helpers/         # Utility functions and helpers
│   ├── stores/          # Pinia stores
│   ├── views/           # Page components
│   ├── assets/          # Static assets
│   ├── constants.js     # App constants
│   ├── main.js          # Application entry point
│   └── App.vue          # Root component
├── public/              # Static public files
├── dist/                # Build output (generated)
└── package.json         # Dependencies and scripts
```

## Development

### Authentication

The application uses JWT authentication with support for:
- Username/password login
- Google OAuth
- Password reset functionality

### State Management

State is managed using Pinia stores located in `src/stores/`. Each store handles a specific domain:
- `auth.store.js` - Authentication state
- `gardens.store.js` - Garden data
- `garden-task.store.js` - Task management
- `event.store.js` - Event management
- And more...

## Deployment

### Firebase Hosting

1. Build the project:
```bash
npm run build
```

2. Deploy to Firebase:
```bash
firebase deploy
```

Or use the automated deployment:
```bash
npm run deploy
```

### GitHub Actions

The project includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) for automated deployment to Firebase Hosting when pushing to `main` or `production` branches.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For questions, feedback, or support, please contact:
- Email: cameron@oufp.org
- Website: https://steward.garden

## Acknowledgments

- Built with Vue 3 and the Vue ecosystem
- Partnered with the Oakland Urban Farming Project (OUFP)
- Community-driven development
