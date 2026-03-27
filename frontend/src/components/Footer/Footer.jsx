import React, { useEffect, useState } from 'react';
import {
  Clapperboard,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Mail,
  Phone,
  MapPin,
  Heart,
  ArrowUp,
  Film,
  Star,
  Ticket,
  Popcorn,
  Github
} from 'lucide-react';
import { footerStyles } from '../../assets/dummyStyles';

const Footer = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [subEmail, setSubEmail] = useState("");
  const [subStatus, setSubStatus] = useState(null); // null | 'loading' | 'success' | 'already' | 'error'
  const [subMsg, setSubMsg] = useState("");

  const handleSubscribe = async (e) => {
    e.preventDefault();
    const email = subEmail.trim();
    if (!email) return;
    setSubStatus("loading");
    setSubMsg("");
    try {
      const res = await fetch("http://localhost:5000/api/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.status === 201) {
        setSubStatus("success");
        setSubMsg(data.message);
        setSubEmail("");
      } else if (res.status === 409) {
        setSubStatus("already");
        setSubMsg(data.message);
      } else {
        setSubStatus("error");
        setSubMsg(data.message || "Something went wrong.");
      }
    } catch {
      setSubStatus("error");
      setSubMsg("Could not connect. Please try again.");
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const links = [
    { label: "Home", href: "/" },
    { label: "Movies", href: "/movies" },
    { label: "Releases", href: "/releases" },
    { label: "Contact", href: "/contact" },
    { label: "Login", href: "/login" }
  ];

  const genreLinks = [
    { label: "Horror", href: "/movies" },
    { label: "Thriller", href: "/movies" },
    { label: "Action", href: "/movies" },
    { label: "Drama", href: "/movies" },
    { label: "Comedy", href: "/movies" },
  ];

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  // Array of icon components for the floating animation
  const floatingIcons = [Clapperboard, Film, Star, Ticket, Popcorn];

  return (
    <footer className={footerStyles.footer}>
      {/* Animated border */}
      <div className={footerStyles.animatedBorder} />

      {/* Animated background elements */}
      <div className={footerStyles.bgContainer}>
        {/* left/top glow: smaller on small screens */}
        <div className={footerStyles.bgGlow1} />
        {/* bottom/right glow: responsive sizes */}
        <div className={footerStyles.bgGlow2} />
      </div>

      {/* Floating icons - hidden on small devices to avoid overlap; still visible on md+ (tablet & desktop) */}
      <div className={footerStyles.floatingIconsContainer}>
        {[...Array(12)].map((_, i) => {
          const IconComponent = floatingIcons[i % floatingIcons.length];
          // Use deterministic-ish positions so layout is stable across renders on same screen size:
          const left = (i * 23) % 100; // simple spread
          const top = (i * 17) % 100;
          const dur = 6 + (i % 5);
          const delay = (i % 4) * 0.6;
          return (
            <div
              key={i}
              className={footerStyles.floatingIcon}
              style={{
                left: `${left}%`,
                top: `${top}%`,
                animation: `float ${dur}s infinite ease-in-out`,
                animationDelay: `${delay}s`
              }}
            >
              <IconComponent className="w-8 h-8" />
            </div>
          );
        })}
      </div>

      {/* Main footer content */}
      <div className={footerStyles.mainContainer}>
        <div className={footerStyles.gridContainer}>
          {/* Brand section */}
          <div className={footerStyles.brandContainer}>
            <div className={footerStyles.brandLogoContainer}>
              <div className="relative">
                <div className={footerStyles.logoGlow} />
                <div className={footerStyles.logoContainer}>
                  <Clapperboard className={footerStyles.logoIcon} />
                </div>
              </div>
              <h2
                className={footerStyles.brandTitle}
                style={{ fontFamily: "Monoton, cursive" }}
              >
                Cine<span className={footerStyles.brandTitleWhite}>Verse</span>
              </h2>
            </div>
            <p className={footerStyles.brandDescription}>
              Experience the dark side of cinema with the latest news, reviews, and exclusive content.
            </p>
            <div className={footerStyles.socialContainer}>
              {[
                { Icon: Facebook, href: "https://www.facebook.com/profile.php?id=61554924463127" },
                { Icon: Twitter, href: "https://x.com/shanil46013" },
                { Icon: Instagram, href: "https://www.instagram.com/danish_shanil/?hl=en" },
                { Icon: Github, href: "https://github.com/DanishShah619" }
              ].map((item, index) => (
                <a
                  key={index}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={footerStyles.socialLink}
                  aria-label={`Visit our ${item.Icon.name || 'social'} page`}
                >
                  <item.Icon className={footerStyles.socialIcon} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className={footerStyles.sectionHeader}>
              <div className={footerStyles.sectionDot} />
              Explore
            </h3>
            <ul className={footerStyles.linksList}>
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className={footerStyles.linkItem}
                    aria-label={link.label}
                  >
                    <span className={footerStyles.linkDot} />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Genres */}
          <div>
            <h3 className={footerStyles.sectionHeader}>
              <div className={footerStyles.sectionDot} />
              Genres
            </h3>
            <ul className={footerStyles.linksList}>
              {genreLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className={footerStyles.linkItem}
                    aria-label={link.label}
                  >
                    <div className={footerStyles.linkDot} />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className={footerStyles.sectionHeader}>
              <div className={footerStyles.sectionDot} />
              Contact Us
            </h3>
            <ul className={footerStyles.contactList}>
              <li className={footerStyles.contactItem}>
                <div className={footerStyles.contactIconContainer}>
                  <Mail className={footerStyles.contactIcon} />
                </div>
                <span className={footerStyles.contactText}>shanildanshah@gmail.com</span>
              </li>
              <li className={footerStyles.contactItem}>
                <div className={footerStyles.contactIconContainer}>
                  <Phone className={footerStyles.contactIcon} />
                </div>
                <span className={footerStyles.contactText}>+91 9123707332</span>
              </li>
              <li className={footerStyles.contactItem}>
                <div className={footerStyles.contactIconContainer}>
                  <MapPin className={footerStyles.contactIcon} />
                </div>
                <span className={footerStyles.contactText}>West Bengal, India</span>
              </li>
            </ul>
          </div>
        </div>

        {/* ── Join CineNews newsletter ── */}
        <div className="mt-10 rounded-2xl border border-red-800/40 bg-white/5 backdrop-blur-sm p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Mail className="h-5 w-5 text-red-400" />
              Join <span className="text-red-400">CineNews</span>
            </h3>
            <p className="mt-1 text-sm text-gray-400">
              Get the latest movie drops, exclusive offers, and showtime alerts straight to your inbox.
            </p>
          </div>

          <form
            onSubmit={handleSubscribe}
            className="flex w-full sm:w-auto gap-2"
            noValidate
          >
            <input
              type="email"
              id="footer-subscribe-email"
              value={subEmail}
              onChange={(e) => { setSubEmail(e.target.value); setSubStatus(null); }}
              placeholder="your@email.com"
              required
              disabled={subStatus === "loading" || subStatus === "success"}
              className="flex-1 sm:w-56 h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/60 disabled:opacity-50"
            />
            <button
              type="submit"
              id="footer-subscribe-btn"
              disabled={subStatus === "loading" || subStatus === "success"}
              className="h-10 px-4 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold transition flex items-center gap-2 whitespace-nowrap"
            >
              {subStatus === "loading" ? (
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : subStatus === "success" ? (
                "✓ Subscribed"
              ) : (
                "Subscribe"
              )}
            </button>
          </form>

          {/* Feedback message */}
          {subMsg && (
            <p
              className={`text-xs mt-1 sm:mt-0 sm:ml-2 ${
                subStatus === "success"
                  ? "text-green-400"
                  : subStatus === "already"
                  ? "text-amber-400"
                  : "text-red-400"
              }`}
            >
              {subMsg}
            </p>
          )}
        </div>

        {/* Divider */}
        <div className={footerStyles.divider}>
          <div className={footerStyles.dividerIconContainer}>
            <Film className={footerStyles.dividerIcon} />
          </div>
        </div>

        {/* Bottom bar */}
        <div className={footerStyles.bottomBar}>
          {/* Center: Designed by (plain text) + Danish Shanil Shah (link only) */}
          <div className={footerStyles.designedBy}>
            <span className={footerStyles.designedByText}>Designed by</span>
            <a
              href="https://hexagondigitalservices.com/"
              target="_blank"
              rel="noopener noreferrer"
              className={footerStyles.designedByLink}
              aria-label="Danish Shanil Shah"
            >
              Danish Shanil Shah
            </a>
          </div>

          <div className={footerStyles.policyLinks}>
            {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((item, index) => (
              <a
                key={index}
                href="#"
                className={footerStyles.policyLink}
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll to top button */}
      {isVisible && (
        <button
          onClick={scrollToTop}
          className={footerStyles.scrollTopButton}
          aria-label="Scroll to top"
        >
          <ArrowUp className={footerStyles.scrollTopIcon} />
        </button>
      )}

      {/* Custom styles for animations */}
      <style>{footerStyles.customCSS}</style>
    </footer>
  );
};

export default Footer;