/**
 * Filas reales del export de Cocos, recortadas y anonimizadas. Cada bloque
 * cubre un caso que rompió alguna vez: el precio por 1.000 cuotapartes de los
 * FCI, el precio por 100 VN de las ONs, las dos patas de un dólar MEP y los
 * movimientos de efectivo sin instrumento.
 */
export const COCOS_HEADER =
  'nroTicket;nroComprobante;fechaEjecucion;fechaLiquidacion;tipoOperacion;instrumento;moneda;mercado;cantidad;precio;montoBruto;comision;ddmm;iva;otros;total';

export const CEDEAR_BUY =
  '116408820;5390023;03-08-2026;03-08-2026;Compra;CEDEAR PALANTIR TECHNOLOGIES INC (PLTR);ARS;BYMA;4;66.275;-265.100;-1.192,95;-132,55;-278,355;0;-266.703,86';

/** Precio 1.422,719 pero el bruto dice 600.000 sobre 421.727,6918 cuotapartes. */
export const FCI_SUBSCRIPTION =
  '116391049;6539317;03-08-2026;03-08-2026;Liquidacion Suscripcion Fci;FCI COCOS PESOS PLUS CL.A $ (COCOSPPA);ARS;;421.727,6918;1.422,719;-600.000;0;0;0;0;-600.000';

/** ON cotizada por cada 100 VN: 156.885 × 105,5 / 100 = 165.513,68. */
export const ON_SELL_ARS =
  '116960689;5545431;06-08-2026;06-08-2026;Venta Registracion ARS;ON TARJETA NARANJA CL.66 S.1 30/11/26 $ (T661O);ARS;MAE;-156.885;105,5;165.513,675;0;0;0;0;165.513,68';

/** La otra pata del mismo canje, que en el archivo viene antes que la venta. */
export const ON_BUY_USD =
  '116942826;5528022;06-08-2026;06-08-2026;Compra Registracion USD;ON TARJETA NARANJA CL.66 S.1 30/11/26 $ (T661O);USD;MAE;156.885;0,07;-109,8195;0;0;0;0;-109,82';

export const CASH_DEPOSIT =
  '116218782;22223267;03-08-2026;03-08-2026;Recibo De Cobro;;ARS;;;;800.000;0;0;0;0;800.000';

export const CASH_WITHDRAWAL =
  '117925156;22911164;13-08-2026;13-08-2026;Orden De Pago;;ARS;;;;-41.977,69;0;0;0;0;-41.977,69';

/** Dividendo en especie: no debe crear una posición de "Dólar estadounidense". */
export const DIVIDEND =
  '111417635;1072208;29-06-2026;29-06-2026;DIVIDENDOS EN ESPECIE;Dólar estadounidense;ARS;;0,06;0;0;0;-0,3174;-0,0667;0;-0,38';

export function csv(...rows: string[]): string {
  return [COCOS_HEADER, ...rows].join('\n');
}
