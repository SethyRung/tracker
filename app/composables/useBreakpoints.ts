export function useBreakpoints() {
  return {
    isSM: useMediaQuery("(min-width: 40rem)"),
    isMD: useMediaQuery("(min-width: 48rem)"),
    isLG: useMediaQuery("(min-width: 64rem)"),
    isXL: useMediaQuery("(min-width: 80rem)"),
    is2XL: useMediaQuery("(min-width: 96rem)"),
  };
}
