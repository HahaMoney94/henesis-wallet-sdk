import { Pagination, PaginationOptions, Timestamp } from "../types";
import { Client } from "../httpClient";
import { BNConverter, parseResponseToTransfer } from "../utils/common";
import { makeQueryString } from "../utils/url";
import { BtcTransaction, BtcTransactionOutput } from "./wallet";

export interface TransferPaginationOptions extends PaginationOptions {
  walletId?: string;
  type?: TransferType;
  status?: TransferStatus;
  address?: string;
  transactionHash?: string;
  updatedAtGte?: Timestamp;
  updatedAtLt?: Timestamp;
}

export enum TransferType {
  WITHDRAWAL = "WITHDRAWAL",
  DEPOSIT = "DEPOSIT",
}

export enum TransferStatus {
  PENDING = "PENDING",
  MINED = "MINED",
  CONFIRMED = "CONFIRMED",
}

export interface Transfer {
  id: string;
  walletId: string;
  outputIndex: number;
  transaction: BtcTransaction;
  receivedAt: string;
  sendTo: string;
  type: TransferType;
  status: TransferStatus;
  createdAt: string;
  updatedAt: string;
}

export class BtcTransfers {
  private readonly client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  public async getTransfer(id: string): Promise<Transfer> {
    const response = await this.client.get(`/transfers/${id}`);
    return parseResponseToTransfer(response);
  }

  public async getTransfers(
    options?: TransferPaginationOptions
  ): Promise<Pagination<Transfer>> {
    const queryString: string = makeQueryString(options);
    const data: Pagination<any> = await this.client.get(
      `/transfers${queryString ? `?${queryString}` : ""}`
    );

    return {
      pagination: data.pagination,
      results: data.results.map((t) => {
        return parseResponseToTransfer(t);
      }),
    };
  }
}
