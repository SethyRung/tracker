export function useBreakpoints() {
  const mounted = ref(false);
  onMounted(() => {
    mounted.value = true;
  });

  function matches(query: string) {
    const media = useMediaQuery(query);
    return computed(() => mounted.value && media.value);
  }

  return {
    isSM: matches("(min-width: 40rem)"),
    isMD: matches("(min-width: 48rem)"),
    isLG: matches("(min-width: 64rem)"),
    isXL: matches("(min-width: 80rem)"),
    is2XL: matches("(min-width: 96rem)"),
  };
}
