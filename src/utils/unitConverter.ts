/**
 * Utilitário para conversão automática de unidades de medida
 */

export interface ConvertedUnit {
  value: number;
  unit: string;
  formatted: string;
}

/**
 * Converte automaticamente unidades quando o valor for >= 1000
 * - g para kg quando >= 1000g
 * - ml para l quando >= 1000ml
 * 
 * @param value - Valor numérico
 * @param unit - Unidade original (g, ml, etc.)
 * @returns Objeto com valor convertido, unidade e string formatada
 */
export function convertUnit(value: number, unit: string): ConvertedUnit {
  if (!value || value < 1000) {
    return {
      value,
      unit,
      formatted: `${value.toFixed(2)}${unit}`
    };
  }

  // Conversões disponíveis
  const conversions: Record<string, { newUnit: string; factor: number }> = {
    'g': { newUnit: 'kg', factor: 1000 },
    'ml': { newUnit: 'l', factor: 1000 }
  };

  const conversion = conversions[unit.toLowerCase()];
  
  if (conversion && value >= conversion.factor) {
    const convertedValue = value / conversion.factor;
    return {
      value: convertedValue,
      unit: conversion.newUnit,
      formatted: `${convertedValue.toFixed(2)}${conversion.newUnit}`
    };
  }

  // Se não há conversão disponível, retorna o valor original
  return {
    value,
    unit,
    formatted: `${value.toFixed(2)}${unit}`
  };
}

/**
 * Formata quantidade com conversão automática de unidade
 * 
 * @param quantidade - Valor numérico
 * @param unidade - Unidade de medida
 * @returns String formatada com conversão automática
 */
export function formatQuantityWithUnit(quantidade: number | null | undefined, unidade: string | null | undefined): string {
  if (!quantidade || !unidade) {
    return '0.00';
  }

  const converted = convertUnit(quantidade, unidade);
  return converted.formatted;
}