import {
  BlockchainDriver,
  BlockchainSpecificParamsOf,
  CallResult,
  Event,
  TransactionManager,
  TransactionParams,
  TransactionReceipt,
} from '@castframework/transaction-manager';
import { Observable } from 'rxjs';

export abstract class SmartContract<
  Driver extends BlockchainDriver<unknown, unknown>,
> {
  constructor(
    protected readonly smartContractAddress: string,
    protected readonly transactionManager: TransactionManager<Driver>,
    protected readonly contractBlockchainSpecificParams: Partial<
      BlockchainSpecificParamsOf<Driver>
    > = {},
  ) {}

  protected async _send<MethodParametersType extends unknown[]>(
    methodName: string,
    methodParameters: MethodParametersType,
    transactionParams?: TransactionParams,
    transactionBlockchainSpecificParams?: Partial<
      BlockchainSpecificParamsOf<Driver>
    >,
  ): Promise<TransactionReceipt> {
    const blockchainSpecificParams = {
      ...this.contractBlockchainSpecificParams,
      ...transactionBlockchainSpecificParams,
    };

    return await this.transactionManager.send<MethodParametersType>({
      to: this.smartContractAddress,
      methodName: methodName,
      methodParameters: methodParameters,
      transactionParams,
      blockchainSpecificParams,
    });
  }

  protected async _call<MethodParametersType extends unknown[], CallReturnType>(
    methodName: string,
    methodParameters: MethodParametersType,
    transactionBlockchainSpecificParams?: Partial<
      BlockchainSpecificParamsOf<Driver>
    >,
  ): Promise<CallResult<CallReturnType>> {
    const blockchainSpecificParams = {
      ...this.contractBlockchainSpecificParams,
      ...transactionBlockchainSpecificParams,
    };
    return await this.transactionManager.call<
      MethodParametersType,
      CallReturnType
    >({
      to: this.smartContractAddress,
      methodName: methodName,
      methodParameters: methodParameters,
      blockchainSpecificParams,
    });
  }

  protected _listen<EventType extends Event<string>>(
    eventName: string,
    listenBlockchainSpecificParams?: Partial<
      BlockchainSpecificParamsOf<Driver>
    >,
    from?: number,
  ): Observable<EventType> {
    const blockchainSpecificParams = {
      ...this.contractBlockchainSpecificParams,
      ...listenBlockchainSpecificParams,
    };
    return this.transactionManager.listen({
      from,
      eventName: eventName,
      smartContractAddress: this.smartContractAddress,
      blockchainSpecificParams,
    });
  }
}
