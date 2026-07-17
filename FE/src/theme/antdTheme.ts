import { theme as antdTheme } from 'antd';
import type { ThemeConfig } from 'antd';
import { colors, typography, radius } from '../theme';

/**
 * Work@X Antd Dark Theme Configuration
 *
 * Enforces a Minimalist Dark Mode across all Antd components:
 *   - Background: Dark charcoal (#080B14 / #0E1220)
 *   - Primary Accent: Vibrant purple (#8B5CF6)
 *   - Secondary Accents: Electric blue, teal, yellow
 *   - Typography: Clean white / slate text
 */
export const workXTheme: ThemeConfig = {
  algorithm: antdTheme.darkAlgorithm,

  // ─── Global Design Tokens ────────────────────────────────────────────────
  token: {
    // Colors
    colorPrimary:          colors.primary[500],      // #8B5CF6
    colorBgBase:           colors.bg.base,            // #080B14
    colorBgContainer:      colors.bg.surface,         // #0E1220
    colorBgElevated:       colors.bg.elevated,        // #141828
    colorBgSpotlight:      colors.bg.overlay,         // #1A2030
    colorTextBase:         colors.text.primary,       // #F8FAFC
    colorTextSecondary:    colors.text.secondary,     // #94A3B8
    colorBorderSecondary:  colors.border.default,     // rgba(255,255,255,0.10)
    colorBorder:           colors.border.default,
    colorSuccess:          colors.semantic.success,   // #10B981
    colorWarning:          colors.semantic.warning,   // #F59E0B
    colorError:            colors.semantic.error,     // #EF4444
    colorInfo:             colors.semantic.info,      // #3B82F6

    // Typography
    fontFamily:            typography.fontFamily.sans,
    fontFamilyCode:        typography.fontFamily.mono,
    fontSize:              14,
    fontSizeLG:            16,
    fontSizeXL:            18,
    fontSizeHeading1:      32,
    fontSizeHeading2:      24,
    fontSizeHeading3:      20,
    fontSizeHeading4:      17,

    // Shape
    borderRadius:          parseInt(radius.md),        // 10px
    borderRadiusLG:        parseInt(radius.lg),        // 14px
    borderRadiusSM:        parseInt(radius.sm),        // 6px
    borderRadiusXS:        4,

    // Motion
    motionDurationFast:    '150ms',
    motionDurationMid:     '250ms',
    motionDurationSlow:    '400ms',
    motionEaseInOut:       'cubic-bezier(0.4, 0, 0.2, 1)',
    motionEaseOut:         'cubic-bezier(0, 0, 0.2, 1)',

    // Layout
    controlHeight:         40,
    controlHeightLG:       48,
    controlHeightSM:       32,
    lineWidth:             1,
  },

  // ─── Component-Level Overrides ────────────────────────────────────────────
  components: {
    // Layout
    Layout: {
      headerBg:         'transparent',
      bodyBg:           'transparent',
      footerBg:         'transparent',
      siderBg:          colors.bg.surface,
    },

    // Card
    Card: {
      colorBgContainer:   colors.bg.surface,
      borderRadiusLG:     parseInt(radius['2xl']),
      colorBorderSecondary: colors.border.default,
      paddingLG:          24,
    },

    // Button
    Button: {
      controlHeight:      40,
      controlHeightLG:    48,
      controlHeightSM:    32,
      borderRadius:       parseInt(radius.lg),
      colorPrimary:       colors.primary[500],
      colorPrimaryHover:  colors.primary[400],
      colorPrimaryActive: colors.primary[600],
      fontWeight:         600,
    },

    // Menu (Sidebar nav)
    Menu: {
      darkItemBg:                 colors.bg.surface,
      darkItemColor:              colors.text.secondary,
      darkItemHoverColor:         colors.text.primary,
      darkItemHoverBg:            'rgba(139,92,246,0.08)',
      darkItemSelectedColor:      colors.text.primary,
      darkItemSelectedBg:         'rgba(139,92,246,0.15)',
      darkSubMenuItemBg:          colors.bg.surface,
      itemBorderRadius:           parseInt(radius.lg),
      itemMarginInline:           8,
      iconSize:                   18,
      iconMarginInlineEnd:        12,
      collapsedIconSize:          20,
    },

    // Segmented (Score tab switcher)
    Segmented: {
      trackBg:            'rgba(255,255,255,0.05)',
      itemColor:          colors.text.secondary,
      itemHoverColor:     colors.text.primary,
      itemHoverBg:        'rgba(255,255,255,0.08)',
      itemSelectedColor:  colors.text.primary,
      itemSelectedBg:     'rgba(139,92,246,0.25)',
      borderRadius:       parseInt(radius.lg),
    },

    // Progress (circular gauges)
    Progress: {
      colorSuccess:         colors.semantic.success,
      remainingColor:       'rgba(255,255,255,0.06)',
      lineBorderRadius:     parseInt(radius.full),
      circleTextColor:      colors.text.primary,
      defaultColor:         colors.primary[500],
    },

    // Switch (Open-to-Work toggle)
    Switch: {
      colorPrimary:       colors.semantic.success,    // green when ON
      colorPrimaryHover:  '#0EA871',
      handleBg:           '#FFFFFF',
    },

    // Badge
    Badge: {
      colorBgContainer:   colors.bg.elevated,
      colorError:         colors.semantic.error,
      colorSuccess:       colors.semantic.success,
    },

    // Tag
    Tag: {
      colorBgContainer:   'rgba(255,255,255,0.05)',
      colorBorder:        colors.border.default,
      colorText:          colors.text.secondary,
      borderRadiusSM:     parseInt(radius.sm),
    },

    // Tooltip
    Tooltip: {
      colorBgSpotlight:   colors.bg.elevated,
      colorTextLightSolid: colors.text.primary,
      borderRadius:       parseInt(radius.md),
    },

    // Avatar
    Avatar: {
      colorBgContainer:   colors.bg.elevated,
      colorTextPlaceholder: colors.text.secondary,
    },

    // Dropdown / Popover
    Dropdown: {
      colorBgElevated:    colors.bg.elevated,
      controlItemBgHover: 'rgba(139,92,246,0.08)',
      borderRadiusLG:     parseInt(radius.lg),
    },

    // Input
    Input: {
      colorBgContainer:   'rgba(255,255,255,0.05)',
      colorBorder:        colors.border.default,
      colorText:          colors.text.primary,
      colorTextPlaceholder: colors.text.tertiary,
      activeBorderColor:  colors.primary[400],
      hoverBorderColor:   colors.border.strong,
    },

    // Divider
    Divider: {
      colorSplit:         colors.border.subtle,
    },

    // Spin / Loading
    Spin: {
      colorPrimary:       colors.primary[500],
    },

    // Message / Notification
    Message: {
      colorBgElevated:    colors.bg.elevated,
      colorText:          colors.text.primary,
    },

    // Modal
    Modal: {
      colorBgElevated:    colors.bg.elevated,
      colorBgMask:        'rgba(0,0,0,0.7)',
      borderRadiusLG:     parseInt(radius['2xl']),
    },
  },
};
