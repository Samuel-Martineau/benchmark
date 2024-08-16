const data: Record<string, Record<string, number[]>> = {};

export function measure(group: string) {
  data[group] ??= {};
  return async <T extends () => any>(
    label: string,
    func: T,
  ): Promise<Awaited<ReturnType<T>>> => {
    const start = performance.now();
    const toReturn = await func();
    const end = performance.now();
    (data[group][label] ??= []).push(end - start);
    return toReturn;
  };
}

function roundToOrder(num: number, order: number) {
  const factor = Math.pow(10, -order);
  return Math.round((num + Number.EPSILON) * factor) / factor;
}

function summaryStatistics(datums: number[]) {
  const mean = datums.reduce((acc, curr) => acc + curr, 0) / datums.length;
  const standardDeviation = Math.sqrt(
    datums.reduce((acc, curr) => acc + Math.pow(curr - mean, 2), 0) /
      (datums.length - 1),
  );

  const uncertainty = +standardDeviation.toPrecision(1);
  const value = roundToOrder(mean, Math.floor(Math.log10(uncertainty)));

  return `${value} ± ${uncertainty}`;
}

export function summarizeResults() {
  return JSON.stringify(
    data,
    (_, value) => {
      if (value instanceof Array) return summaryStatistics(value);
      return value;
    },
    2,
  );
}
