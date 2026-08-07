'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Palette, Volume2, VolumeX, Lock, Check, Sparkles } from 'lucide-react'
import { useWaitingRoomTheme } from '@/context/WaitingRoomThemeContext'
import { THEME_CONFIGS, THEME_PACKS, getDailyTheme, WaitingRoomThemeId } from '@/types/waitingRoomTheme'

/**
 * ThemeSelector — UI for selecting waiting room themes.
 * Shows all available themes grouped by pack, with premium lock indicators.
 * Also includes sound toggle and daily featured theme indicator.
 */
export function ThemeSelector() {
  const { state, activeConfig, setTheme, toggleSound } = useWaitingRoomTheme()
  const [open, setOpen] = useState(false)
  const dailyTheme = getDailyTheme()

  const handleSelect = (themeId: WaitingRoomThemeId) => {
    const config = THEME_CONFIGS[themeId]
    if (config.isPremium && !state.hasPremium) return // Locked
    setTheme(themeId)
  }

  return (
    <>
      {/* Theme selector button */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        whileTap={{ y: 0 }}
        onClick={() => setOpen(true)}
        className="nav-btn flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] backdrop-blur-xl border border-white/[0.12] text-xs font-medium text-[#9CA3AF] hover:text-white hover:border-[#A855F7]/40 hover:bg-white/[0.08] hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all duration-250"
      >
        <Palette className="w-3.5 h-3.5" style={{ color: activeConfig.primaryColor }} />
        <span>{activeConfig.icon} {activeConfig.name}</span>
      </motion.button>

      {/* Sound toggle */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        whileHover={{ y: -2 }}
        whileTap={{ y: 0 }}
        onClick={toggleSound}
        className="nav-btn flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] backdrop-blur-xl border border-white/[0.12] text-xs font-medium text-[#9CA3AF] hover:text-white hover:border-[#A855F7]/40 hover:bg-white/[0.08] hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all duration-250"
      >
        {state.soundEnabled ? (
          <Volume2 className="w-3.5 h-3.5 text-[#22C55E]" />
        ) : (
          <VolumeX className="w-3.5 h-3.5" />
        )}
        <span>{state.soundEnabled ? 'Sound On' : 'Sound Off'}</span>
      </motion.button>

      {/* Theme selector modal */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[401] mx-auto max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl border border-white/[0.1] bg-[#111827] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Waiting Room Themes</h3>
                  <p className="text-xs text-[#9CA3AF] mt-1">
                    Today's featured: <span className="text-[#EC4899] font-semibold">{THEME_CONFIGS[dailyTheme].icon} {THEME_CONFIGS[dailyTheme].name}</span>
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-lg hover:bg-white/[0.06] text-[#9CA3AF] hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Theme packs */}
              {Object.entries(THEME_PACKS).map(([packId, pack]) => (
                <div key={packId} className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm">{pack.icon}</span>
                    <h4 className="text-sm font-semibold text-white">{pack.name}</h4>
                    {packId === 'free' && (
                      <span className="px-2 py-0.5 rounded-full bg-[#22C55E]/10 text-[9px] font-bold text-[#22C55E]">FREE</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {pack.themes.map((themeId) => {
                      const config = THEME_CONFIGS[themeId]
                      const isActive = state.activeTheme === themeId
                      const isLocked = config.isPremium && !state.hasPremium
                      const isDaily = dailyTheme === themeId

                      return (
                        <motion.button
                          key={themeId}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSelect(themeId)}
                          className={`relative rounded-xl border p-3 text-left transition-all duration-300 ${
                            isActive
                              ? 'border-[#EC4899]/50 bg-[#EC4899]/10'
                              : 'border-white/[0.08] bg-white/[0.03] hover:border-white/[0.15]'
                          } ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {/* Theme preview */}
                          <div
                            className="h-16 rounded-lg mb-2"
                            style={{
                              background: `linear-gradient(135deg, ${config.bgGradient[0]}, ${config.bgGradient[1]}, ${config.bgGradient[2]})`,
                            }}
                          />
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">{config.icon}</span>
                              <span className="text-[11px] font-semibold text-white">{config.name}</span>
                            </div>
                            {isActive && <Check className="w-3.5 h-3.5 text-[#EC4899]" />}
                            {isLocked && <Lock className="w-3 h-3 text-[#9CA3AF]" />}
                          </div>
                          {isDaily && (
                            <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#F59E0B]/20 text-[8px] font-bold text-[#F59E0B]">
                              <Sparkles className="w-2 h-2" />
                              DAILY
                            </div>
                          )}
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
              ))}

              {/* Premium note */}
              {!state.hasPremium && (
                <div className="mt-4 p-3 rounded-xl border border-[#EC4899]/20 bg-[#EC4899]/5">
                  <p className="text-[11px] text-[#9CA3AF]">
                    <span className="text-[#EC4899] font-semibold">Premium themes</span> are available with a Premium subscription.
                    Unlock all 12 themes and override creator themes.
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default ThemeSelector