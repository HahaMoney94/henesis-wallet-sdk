import BN from "bn.js";
import { Contract } from "web3-eth-contract";
import Web3 from "web3";
import { AbiItem } from "web3-utils";
import walletAbi from "../contracts/Wallet.json";
import erc20Abi from "../contracts/ERC20.json";
import { CoinDTO, CoinDTOAttributesEnum } from "../__generate__/eth";
import AttributesEnum = CoinDTOAttributesEnum;
import { BNConverter } from "../utils/common";
import { MultiSigPayload } from "./transactions";
import { EthLikeWallet } from "./wallet";

export abstract class Coin {
  protected coinData: CoinDTO;
  protected readonly walletContract: Contract;

  protected constructor(coinData: CoinDTO) {
    this.coinData = coinData;
    this.walletContract = new new Web3().eth.Contract(walletAbi as AbiItem[]);
  }

  public getCoinData(): CoinDTO {
    return this.coinData;
  }

  abstract async buildTransferMultiSigPayload(
    wallet: EthLikeWallet,
    to: string,
    amount: BN
  ): Promise<MultiSigPayload>;

  protected async buildTransferMultiSigPayloadTemplate(wallet: EthLikeWallet) {
    return {
      walletNonce: await wallet.getNonce(),
      value: BNConverter.hexStringToBN("0x0"),
      walletAddress: wallet.getAddress(),
    };
  }

  abstract getName(): string;

  abstract buildFlushData(
    targetAddresses: string[],
    tokenAddress?: string
  ): string;

  abstract getAttributes(): AttributesEnum[];
}

export class StandardErc20 extends Coin {
  constructor(coinData: CoinDTO) {
    super(coinData);
  }

  getAddress(): string {
    return this.coinData.address;
  }

  getName(): string {
    return this.coinData.name;
  }

  async buildTransferMultiSigPayload(
    wallet: EthLikeWallet,
    to: string,
    amount: BN
  ): Promise<MultiSigPayload> {
    return {
      ...(await this.buildTransferMultiSigPayloadTemplate(wallet)),
      hexData: this.walletContract.methods
        .transferToken(this.getAddress(), to, amount)
        .encodeABI(),
      toAddress: wallet.getAddress(),
    };
  }

  buildFlushData(targetAddresses: string[], tokenAddress: string) {
    return this.walletContract.methods
      .flushToken(tokenAddress, targetAddresses)
      .encodeABI();
  }

  getAttributes(): CoinDTOAttributesEnum[] {
    return this.coinData.attributes;
  }
}

export class NonStandardReturnTypeErc20 extends Coin {
  private readonly erc20Contract: Contract;

  constructor(coinData: CoinDTO) {
    super(coinData);
    this.erc20Contract = new new Web3().eth.Contract(erc20Abi as AbiItem[]);
  }

  getAddress(): string {
    return this.coinData.address;
  }

  getName(): string {
    return this.coinData.name;
  }

  async buildTransferMultiSigPayload(
    wallet: EthLikeWallet,
    to: string,
    amount: BN
  ): Promise<MultiSigPayload> {
    if (wallet.getVersion() == "v1" || wallet.getVersion() == "v2") {
      return {
        ...(await this.buildTransferMultiSigPayloadTemplate(wallet)),
        hexData: this.erc20Contract.methods.transfer(to, amount).encodeABI(),
        toAddress: this.coinData.address,
      };
    }

    return {
      ...(await this.buildTransferMultiSigPayloadTemplate(wallet)),
      hexData: this.walletContract.methods
        .transferToken(this.getAddress(), to, amount)
        .encodeABI(),
      toAddress: wallet.getAddress(),
    };
  }

  buildFlushData(targetAddresses: string[], tokenAddress: string) {
    return this.erc20Contract.methods
      .flushToken(tokenAddress, targetAddresses)
      .encodeABI();
  }

  getAttributes(): CoinDTOAttributesEnum[] {
    return this.coinData.attributes;
  }
}

export class Eth extends Coin {
  constructor(coinData: CoinDTO) {
    super(coinData);
  }

  getName(): string {
    return "eth";
  }

  async buildTransferMultiSigPayload(
    wallet: EthLikeWallet,
    to: string,
    amount: BN
  ): Promise<MultiSigPayload> {
    return {
      ...(await this.buildTransferMultiSigPayloadTemplate(wallet)),
      hexData: this.walletContract.methods.transferEth(to, amount).encodeABI(),
      toAddress: wallet.getAddress(),
    };
  }

  buildFlushData(targetAddresses: string[]) {
    return this.walletContract.methods.flushEth(targetAddresses).encodeABI();
  }

  getAttributes(): CoinDTOAttributesEnum[] {
    return this.coinData.attributes;
  }
}

export class Klay extends Coin {
  constructor(coinData: CoinDTO) {
    super(coinData);
  }

  getName(): string {
    return "klay";
  }

  async buildTransferMultiSigPayload(
    wallet: EthLikeWallet,
    to: string,
    amount: BN
  ): Promise<MultiSigPayload> {
    return {
      ...(await this.buildTransferMultiSigPayloadTemplate(wallet)),
      hexData: this.walletContract.methods.transferKlay(to, amount).encodeABI(),
      toAddress: wallet.getAddress(),
    };
  }

  buildFlushData(targetAddresses: string[]) {
    return this.walletContract.methods.flushKlay(targetAddresses).encodeABI();
  }

  getAttributes(): CoinDTOAttributesEnum[] {
    return this.coinData.attributes;
  }
}
