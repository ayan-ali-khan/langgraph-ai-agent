import React from 'react'
import { NavLink } from 'react-router-dom'
import styles from './Layout.module.css'

export default function Layout({ children }) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>⚕</span>
          <span className={styles.logoText}>PharmaAI CRM</span>
        </div>
        <nav className={styles.nav}>
          <NavLink to="/log-interaction" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
            <span className={styles.navIcon}>✏️</span>
            <span>Log Interaction</span>
          </NavLink>
          <NavLink to="/interactions" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
            <span className={styles.navIcon}>📋</span>
            <span>Interactions</span>
          </NavLink>
        </nav>
        <div className={styles.sidebarFooter}>
          <div className={styles.aiChip}>
            <span className={styles.aiDot} />
            <span>AI Agent Active</span>
          </div>
          <div className={styles.repInfo}>
            <div className={styles.avatar}>A</div>
            <div>
              <div className={styles.repName}>Alex Johnson</div>
              <div className={styles.repRole}>Field Rep · Northeast</div>
            </div>
          </div>
        </div>
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  )
}
