# AOE Matchup Game
![App Preview](./public/preview.png)

## 🎮 Project Overview

AOE Matchup Game is an educational tool that helps Age of Empires IV players learn and understand unit matchups. Whether you're a beginner trying to learn the basics or an experienced player looking to sharpen your knowledge, this app provides an interactive way to master the rock-paper-scissors dynamics of AoE IV combat.

## 🎯 How to Use

### Quiz Mode
1. Navigate to the Quiz page
2. Select the number of rounds (5, 10, or 20)
3. For each matchup, click on the unit you think will win
4. Review your score and learn from mistakes at the end

### Sandbox Mode
1. Navigate to the Sandbox page
2. Select two units from the dropdown menus
3. Compare their stats side-by-side
4. Learn the strengths and weaknesses of each unit

## 🛠️ Tech Stack

- **[React](https://react.dev/)** - UI library for building interactive interfaces
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Vite](https://vitejs.dev/)** - Fast build tool and development server
- **[TailwindCSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Zustand](https://zustand-demo.pmnd.rs/)** - Lightweight state management
- **[Framer Motion](https://www.framer.com/motion/)** - Animation library for smooth transitions
- **[Axios](https://axios-http.com/)** - HTTP client for API requests
- **[Shadcn/ui](https://ui.shadcn.com/)** - Re-usable component library
- **[React Router](https://reactrouter.com/)** - Client-side routing

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+ or Bun runtime
- npm, yarn, or bun package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/f2ire/aoe-matchup-game.git
   cd aoe-matchup-game
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   
   Navigate to `http://localhost:8080` (or the port shown in your terminal)

### Build for Production

```bash
npm run build
npm run preview
```

## 🌐 API Reference

This project uses the **[AOE4World API](https://aoe4world.com/)** to fetch:
- Unit data and statistics
- Official unit icons and images
- Real-time game information

The API provides comprehensive data about Age of Empires IV units, ensuring accuracy and up-to-date information for all matchup scenarios.

### API Endpoints Used
- Unit statistics and attributes
- Unit icons and visual assets
- Civilization-specific unit data

## 📁 Project Structure

```
aoe4-matchup-game/
├── src/
│   ├── components/      # Reusable React components
│   ├── pages/          # Main page components (Quiz, Sandbox, Results)
│   ├── data/           # Unit data and configurations
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility functions
│   └── App.tsx         # Main application component
├── public/             # Static assets
└── package.json        # Project dependencies
```

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Inspiration**: This project was inspired by the design principles of [Aegis UI](https://aoe-aegis.vercel.app/)
- **Data Source**: Unit data and icons provided by [AOE4World](https://aoe4world.com/)

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/f2ire/aoe-matchup-game/issues).

## 📧 Contact

For questions or suggestions, please open an issue on GitHub.

---

Made with ❤️ for the Age of Empires IV community
