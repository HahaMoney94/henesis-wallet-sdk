import BN from "bn.js";
import { Client } from "./httpClient";
import { BlockchainType } from "./blockchain";
import {
  Balance,
  Key,
  Keychains,
  KeyWithPriv,
  Pagination,
  PaginationOptions,
} from "./types";
import aesjs from "aes-js";
import { Base64 } from "js-base64";
import {
  ActivateAllowedAddressesRequest as BtcActivateAllowedAddressesRequest,
  AllowedAddressDTO as BtcAllowedAddressDTO,
  CreateWithdrawalPolicyRequest as BtcCreateWithdrawalPolicyRequest,
  KeyDTO as BtcKeyDTO,
  MasterWalletDTO as BtcMasterWalletDTO,
  PaginationAllowedAddressDTO as BtcPaginationAllowedAddressDTO,
  PatchWithdrawalPolicyRequest as BtcPatchWithdrawalPolicyRequest,
  CreateAllowedAddressRequest as BtcCreateAllowedAddressRequest,
  DeleteAllowedAddressRequest as BtcDeleteAllowedAddressRequest,
  InactivateAllowedAddressesRequest as BtcInactivateAllowedAddressesRequest,
} from "./__generate__/btc/api";
import { BNConverter, checkNullAndUndefinedParameter } from "./utils/common";
import { makeQueryString } from "./utils/url";
import {
  ActivateAllowedAddressesRequest as EthActivateAllowedAddressesRequest,
  KeyDTO as EthKeyDTO,
  MasterWalletDTO as EthMasterWalletDTO,
  PaginationWalletWithdrawalPolicyDTO,
  PatchWithdrawalPolicyRequest as EthPatchWithdrawalPolicyRequest,
  WalletWithdrawalPolicyDTO,
  AllowedAddressDTO as EthAllowedAddressDTO,
  PaginationAllowedAddressDTO as EthPaginationAllowedAddressDTO,
  CreateAllowedAddressRequest as EthCreateAllowedAddressRequest,
  DeleteAllowedAddressRequest as EthDeleteAllowedAddressRequest,
  CreateWithdrawalPolicyRequest as EthCreateWithdrawalPolicyRequest,
  InactivateAllowedAddressesRequest as EthInactivateAllowedAddressesRequest,
} from "./__generate__/eth/api";

export type InactivateAllowedAddressesRequest =
  | EthInactivateAllowedAddressesRequest
  | BtcInactivateAllowedAddressesRequest;

export type ActivateAllowedAddressesRequest =
  | EthActivateAllowedAddressesRequest
  | BtcActivateAllowedAddressesRequest;
export type AllowedAddressDTO = EthAllowedAddressDTO | BtcAllowedAddressDTO;
export type AllowedAddress = AllowedAddressDTO;
export type PaginationAllowedAddressDTO =
  | BtcPaginationAllowedAddressDTO
  | EthPaginationAllowedAddressDTO;
export type CreateAllowedAddressRequest =
  | BtcCreateAllowedAddressRequest
  | EthCreateAllowedAddressRequest;
export import WhitelistType = EthCreateAllowedAddressRequest.WhitelistTypeEnum;
export import AllowedCoinType = EthCreateAllowedAddressRequest.AllowedCoinTypeEnum;
export type DeleteAllowedAddressRequest =
  | BtcDeleteAllowedAddressRequest
  | EthDeleteAllowedAddressRequest;

export interface WalletData {
  id: string;
  name: string;
  address: string;
  encryptionKey: string;
  createdAt: string;
  status: WalletStatus;
}

export import PolicyType = WalletWithdrawalPolicyDTO.TypeEnum;
export import WalletType = WalletWithdrawalPolicyDTO.WalletTypeEnum;

export interface WithdrawalPolicy {
  id: string;
  limitAmount: BN;
  walletType: WalletType;
  type: PolicyType;
  coinSymbol: string;
}

export const WalletStatus: Record<
  | keyof typeof EthMasterWalletDTO.StatusEnum
  | keyof typeof BtcMasterWalletDTO.StatusEnum,
  EthMasterWalletDTO.StatusEnum | BtcMasterWalletDTO.StatusEnum
> = { ...EthMasterWalletDTO.StatusEnum, ...BtcMasterWalletDTO.StatusEnum };
export type WalletStatus =
  | EthMasterWalletDTO.StatusEnum
  | BtcMasterWalletDTO.StatusEnum;

export interface AllowedAddressesPaginationOptions extends PaginationOptions {
  coinId?: number;
}

export abstract class Wallet<T> {
  protected readonly client: Client;

  protected readonly withdrawalApprovalUrl: string = "/withdrawal-approvals";

  protected readonly baseUrl;

  protected readonly keychains: Keychains;

  protected constructor(client: Client, keychains: Keychains, baseUrl: string) {
    this.client = client;
    this.keychains = keychains;
    this.baseUrl = baseUrl;
  }

  abstract getChain(): BlockchainType;

  abstract getBalance(flag?: boolean): Promise<Balance[]>;

  abstract getAddress(): string;

  abstract getId(): string;

  abstract changeName(name: string);

  abstract getEncryptionKey(): string;

  abstract getAccountKey(): Key;

  abstract updateAccountKey(key: Key);

  protected recoverPassphrase(encryptedPassphrase: string): string {
    try {
      const aesCtr = new aesjs.ModeOfOperation.ctr(
        aesjs.utils.hex.toBytes(this.getEncryptionKey())
      );
      const decryptedBytes = aesCtr.decrypt(
        aesjs.utils.hex.toBytes(Base64.decode(encryptedPassphrase))
      );
      return aesjs.utils.utf8.fromBytes(decryptedBytes);
    } catch (e) {
      throw new Error("failed to recover passphrase");
    }
  }

  async changePassphrase(
    passphrase: string,
    newPassphrase: string,
    otpCode?: string
  ): Promise<void> {
    checkNullAndUndefinedParameter({
      passphrase,
      newPassphrase,
    });
    return await this.changePassphraseWithKeyFile(
      passphrase,
      newPassphrase,
      undefined,
      otpCode
    );
  }

  private async changePassphraseWithKeyFile(
    passphrase: string,
    newPassphrase: string,
    initialKey?: Key,
    otpCode?: string
  ): Promise<void> {
    const newKey: KeyWithPriv = this.keychains.changePassword(
      initialKey ? initialKey : this.getAccountKey(),
      passphrase,
      newPassphrase
    );

    const key: Key = await this.client.patch<
      BtcKeyDTO | RequireProperty<EthKeyDTO, "pub">
    >(`${this.baseUrl}/account-key`, {
      keyFile: newKey.keyFile,
      pub: newKey.pub,
      otpCode,
    });

    this.updateAccountKey(key);
  }

  async restorePassphrase(
    encryptedPassphrase: string,
    newPassphrase: string,
    otpCode?: string
  ): Promise<void> {
    const passphrase = this.recoverPassphrase(encryptedPassphrase);
    const initialKey: Key = await this.client.get<
      BtcKeyDTO | RequireProperty<EthKeyDTO, "pub">
    >(`${this.baseUrl}/initial-key`);
    await this.changePassphraseWithKeyFile(
      passphrase,
      newPassphrase,
      initialKey,
      otpCode
    );
  }

  async verifyEncryptedPassphrase(
    encryptedPassphrase: string
  ): Promise<boolean> {
    let passphrase;
    try {
      passphrase = this.recoverPassphrase(encryptedPassphrase);
    } catch (e) {
      return false;
    }

    const initialKey: Key = await this.client.get<
      BtcKeyDTO | RequireProperty<EthKeyDTO, "pub">
    >(`${this.baseUrl}/initial-key`);
    return await this.verifyPassphraseWithKeyFile(passphrase, initialKey);
  }

  async verifyPassphrase(passphrase: string): Promise<boolean> {
    return this.verifyPassphraseWithKeyFile(passphrase);
  }

  protected async verifyPassphraseWithKeyFile(
    passphrase: string,
    initialKey?: Key
  ): Promise<boolean> {
    try {
      this.keychains.decrypt(
        initialKey ? initialKey : this.getAccountKey(),
        passphrase
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  async createWithdrawalPolicy(params: {
    limitAmount: BN;
    walletType: WalletType;
    policyType: PolicyType;
    coinSymbol: string;
    otpCode?: string;
  }): Promise<WithdrawalPolicy> {
    const { limitAmount, walletType, policyType, coinSymbol, otpCode } = params;
    const request:
      | BtcCreateWithdrawalPolicyRequest
      | EthCreateWithdrawalPolicyRequest = {
      limitAmount: BNConverter.bnToHexString(limitAmount),
      walletType: walletType,
      type: policyType,
      coinSymbol,
      otpCode,
    };
    const data = await this.client.post<
      NoUndefinedField<WalletWithdrawalPolicyDTO>
    >(`${this.baseUrl}/withdrawal-policies`, request);
    return {
      ...data,
      limitAmount: BNConverter.hexStringToBN(data.limitAmount),
    };
  }

  async patchWithdrawalPolicy(params: {
    id: string;
    limitAmount: BN;
    otpCode?: string;
  }) {
    const { id, limitAmount, otpCode } = params;
    const request:
      | EthPatchWithdrawalPolicyRequest
      | BtcPatchWithdrawalPolicyRequest = {
      limitAmount: BNConverter.bnToHexString(limitAmount),
      otpCode,
    };
    const data = await this.client.patch<WalletWithdrawalPolicyDTO>(
      `${this.baseUrl}/withdrawal-policies/${id}`,
      request
    );
    return {
      ...data,
      limitAmount: BNConverter.hexStringToBN(data.limitAmount),
    };
  }

  async getWithdrawalPolices(
    options: PaginationOptions
  ): Promise<Pagination<WithdrawalPolicy>> {
    const queryString: string = makeQueryString(options);
    const data = await this.client.get<
      NoUndefinedField<PaginationWalletWithdrawalPolicyDTO>
    >(
      `${this.baseUrl}/withdrawal-policies${
        queryString ? `?${queryString}` : ""
      }`
    );
    return {
      pagination: data.pagination,
      results: data.results.map((data) => {
        return {
          ...data,
          limitAmount: BNConverter.hexStringToBN(data.limitAmount),
        };
      }),
    };
  }

  async createAllowedAddress(params: {
    address: string;
    label: string;
    whitelistType: WhitelistType;
    allowedCoinType: AllowedCoinType;
    otpCode: string;
    coinId: number | null;
  }): Promise<AllowedAddress> {
    const request: CreateAllowedAddressRequest = {
      address: params.address,
      label: params.label,
      coinId: params.coinId,
      whitelistType: params.whitelistType,
      allowedCoinType: params.allowedCoinType,
      otpCode: params.otpCode,
    };
    return await this.client.post<AllowedAddressDTO>(
      `${this.baseUrl}/allowed-addresses`,
      request
    );
  }

  async getAllowedAddresses(
    options?: AllowedAddressesPaginationOptions
  ): Promise<Pagination<AllowedAddress>> {
    const queryString: string = makeQueryString(options);
    return await this.client.get<PaginationAllowedAddressDTO>(
      `${this.baseUrl}/allowed-addresses${queryString ? `?${queryString}` : ""}`
    );
  }

  async getAllowedAddress(id: string): Promise<AllowedAddress> {
    return await this.client.get<AllowedAddressDTO>(
      `${this.baseUrl}/allowed-addresses/${id}`
    );
  }

  async deleteAllowedAddress(id: string, otpCode: string): Promise<void> {
    const request: DeleteAllowedAddressRequest = {
      otpCode,
    };
    await this.client.delete<void>(`${this.baseUrl}/allowed-addresses/${id}`, {
      data: request,
    });
  }

  async activateAllowedAddresses(otpCode: string): Promise<void> {
    const request: ActivateAllowedAddressesRequest = {
      otpCode,
    };

    await this.client.post<void>(
      `${this.baseUrl}/activate-allowed-addresses`,
      request
    );
  }

  async inactivateAllowedAddresses(otpCode: string): Promise<void> {
    const request: InactivateAllowedAddressesRequest = {
      otpCode,
    };

    await this.client.post<void>(
      `${this.baseUrl}/inactivate-allowed-addresses`,
      request
    );
  }
}
