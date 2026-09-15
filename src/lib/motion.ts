export const bezelSpring = {
  type: 'spring',
  stiffness: 380,
  damping: 34,
  mass: 0.9,
} as const

export const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
} as const

export const stagger = (index: number) => ({
  ...fadeUp,
  transition: {
    ...fadeUp.transition,
    delay: Math.min(index, 7) * 0.05,
  },
})
