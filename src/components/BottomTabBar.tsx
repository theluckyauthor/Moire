import React from "react";
import { Link } from "react-router-dom";
import { Home, User, Calendar, Shirt, Compass } from "lucide-react";
import { useActiveTab } from "../hooks/useActiveTab";
import styles from "../styles/components/BottomTabBar.module.css";

const BottomTabBar: React.FC = () => {
  const { isActive } = useActiveTab();

  const navItems = [
    { path: "/closet", icon: Shirt },
    { path: "/calendar", icon: Calendar },
    { path: "/outfits", icon: Home },
    { path: "/explore", icon: Compass },
    { path: "/profile", icon: User },
  ];

  return (
    <nav className={styles.bottomNav}>
      {navItems.map(({ path, icon: Icon }) => (
        <Link
          key={path}
          to={path}
          className={`${styles.navLink} ${
            isActive(path) ? styles.activeLink : styles.inactiveLink
          }`}
        >
          <Icon size={24} />
        </Link>
      ))}
    </nav>
  );
};

export default BottomTabBar;