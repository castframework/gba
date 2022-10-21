import BN from "bn.js";

export function formatParameter(parameter: string | number | BN | undefined): number | undefined {
  let formattedParameter: number | undefined;

  if (BN.isBN(parameter)) {
    formattedParameter = (parameter as BN).toNumber();
  } else if (typeof parameter === 'string') {
    formattedParameter = Number.parseInt(parameter);
  } else {
    formattedParameter = parameter;
  }

  return formattedParameter;
}
