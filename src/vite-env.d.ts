:root {
  font-family: 'Inter', sans-serif;
  color: #edf3ff;
  background: #07111d;
  line-height: 1.5;
  font-weight: 500;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color-scheme: dark;
}

* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  min-height: 100%;
  background:
    radial-gradient(circle at top, rgba(42, 84, 161, 0.35), transparent 32%),
    linear-gradient(180deg, #07111d 0%, #0a1625 40%, #0d1a2b 100%);
}

body {
  min-height: 100vh;
}

button {
  font: inherit;
}

#app {
  width: min(1200px, calc(100% - 32px));
  margin: 0 auto;
  padding: 32px 0 48px;
}

.app-shell {
  display: grid;
  gap: 24px;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0 4px;
}

.brand-wrap {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: linear-gradient(135deg, #4f86ff, #66d9c4);
  color: #07111d;
  font-size: 1.1rem;
  font-weight: 800;
  box-shadow: 0 12px 30px rgba(79, 134, 255, 0.35);
}

.eyebrow {
  margin: 0;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #82aefc;
}

h1 {
  margin: 4px 0 0;
  font-size: clamp(1.4rem, 2vw, 2rem);
}

.nav-tabs {
  display: inline-flex;
  padding: 6px;
  border-radius: 14px;
  background: rgba(15, 24, 38, 0.85);
  border: 1px solid rgba(136, 172, 235, 0.18);
}

.tab-button {
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #dfe9ff;
  padding: 10px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-button.active {
  background: linear-gradient(135deg, rgba(78, 132, 255, 0.18), rgba(101, 221, 196, 0.18));
  color: #f2f7ff;
  box-shadow: inset 0 0 0 1px rgba(132, 177, 255, 0.28);
}

.panel {
  background: rgba(13, 23, 35, 0.84);
  border: 1px solid rgba(143, 177, 233, 0.18);
  border-radius: 22px;
  padding: 24px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.2);
}

.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  min-height: 180px;
}

.hero h2 {
  margin: 12px 0 10px;
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1.1;
  letter-spacing: -0.06em;
}

.hero p {
  margin: 0;
  max-width: 760px;
  color: #bed0ed;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
  background: rgba(10, 16, 22, 0.72);
  border: 1px solid rgba(147, 184, 255, 0.3);
  color: #edf3ff;
  border-radius: 999px;
  padding: 12px 16px;
  font-size: 0.8rem;
  font-weight: 700;
}

.pulse {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #6ae3ba;
  box-shadow: 0 0 0 0 rgba(106, 227, 186, 0.7);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(106, 227, 186, 0.7);
  }
  70% {
    box-shadow: 0 0 0 12px rgba(106, 227, 186, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(106, 227, 186, 0);
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.stat-card {
  padding: 20px 18px;
  background: rgba(14, 24, 38, 0.7);
  border: 1px solid rgba(155, 181, 230, 0.16);
  border-radius: 18px;
}

.stat-card p {
  margin: 0 0 12px;
  color: #b6caeb;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.stat-card h3 {
  margin: 0;
  font-size: clamp(1.4rem, 2.2vw, 2.1rem);
  letter-spacing: -0.05em;
}

.stat-card span {
  display: inline-block;
  margin-top: 12px;
  font-size: 0.75rem;
  color: #dfe9ff;
}

.stat-card.positive {
  box-shadow: inset 0 0 0 1px rgba(76, 209, 152, 0.18);
}

.stat-card.neutral {
  box-shadow: inset 0 0 0 1px rgba(95, 113, 168, 0.18);
}

.stat-card.alert {
  box-shadow: inset 0 0 0 1px rgba(255, 183, 89, 0.18);
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}

.panel-header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.mini-button {
  border: 1px solid rgba(147, 178, 236, 0.2);
  background: rgba(21, 34, 50, 0.8);
  color: #dfeaff;
  border-radius: 10px;
  padding: 8px 12px;
  cursor: pointer;
}

.activity-list,
.priority-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.activity-list li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  padding: 14px 0;
  border-bottom: 1px solid rgba(176, 196, 231, 0.12);
}

.activity-list li:last-child {
  border-bottom: none;
}

.activity-list strong,
.priority-list li {
  display: block;
}

.activity-list small {
  display: block;
  margin-top: 5px;
  color: #a9bdd9;
}

.activity-meta {
  display: grid;
  justify-items: end;
  gap: 6px;
  color: #bcd0ec;
  font-size: 0.74rem;
}

.activity-meta em {
  font-style: normal;
  color: #7ce7c4;
}

.priority-list li {
  position: relative;
  padding-left: 24px;
  margin: 0 0 18px;
  color: #dfeaff;
}

.priority-list li::before {
  content: '•';
  position: absolute;
  left: 0;
  top: 0;
  color: #7cc7ff;
  font-size: 1.5rem;
  line-height: 1;
}

.full-width {
  padding-bottom: 20px;
}

.pipeline {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
}

.step {
  position: relative;
  padding: 18px 14px 14px;
  border: 1px solid rgba(160, 191, 244, 0.18);
  border-radius: 16px;
  background: rgba(18, 31, 47, 0.7);
}

.step::after {
  content: '→';
  position: absolute;
  right: -15px;
  top: 50%;
  transform: translateY(-50%);
  color: #80a9eb;
  font-size: 1.2rem;
}

.step:last-child::after {
  content: '';
}

.step span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4a8dff, #5ed4b6);
  color: #06111c;
  font-weight: 800;
  margin-bottom: 12px;
}

.step p {
  margin: 0;
  color: #dfeaff;
}

.chart {
  padding-top: 10px;
}

.chart-labels {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  color: #afc8ea;
  font-size: 0.72rem;
  margin-bottom: 16px;
}

.chart-bars {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  align-items: end;
  gap: 14px;
  height: 180px;
  padding: 0 8px 6px;
}

.chart-bars span {
  display: block;
  border-radius: 16px 16px 0 0;
  background: linear-gradient(180deg, #5fa3ff 0%, #66d8bf 100%);
  box-shadow: 0 12px 24px rgba(81, 164, 255, 0.25);
}

.hero.emerald {
  background: linear-gradient(135deg, rgba(18, 63, 52, 0.48), rgba(15, 30, 43, 0.78));
}

.hero.blue {
  background: linear-gradient(135deg, rgba(24, 47, 82, 0.58), rgba(15, 30, 43, 0.78));
}

@media (max-width: 980px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .pipeline {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .step::after {
    display: none;
  }
}

@media (max-width: 720px) {
  .topbar,
  .hero,
  .panel-header {
    display: grid;
    align-items: start;
  }

  .stats-grid,
  .content-grid,
  .pipeline {
    grid-template-columns: 1fr;
  }

  #app {
    width: min(100% - 20px, 1200px);
    padding-top: 24px;
  }

  .panel {
    padding: 18px;
  }

  .hero {
    min-height: auto;
  }

  .nav-tabs {
    justify-content: space-between;
    width: 100%;
  }

  .tab-button {
    flex: 1;
  }
}
