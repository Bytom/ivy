import { Action, SpendFromAccount, SpendUnspentOutput, ControlWithProgram } from "../core/types"
import { getSpendInputMap, getSpendUnspentOutputAction, getGasAction, getSpendContract, getSpendContractArgs, getSelectedClause } from "./selectors";
import { AppState } from "../app/types";
import { client } from "../core";

abstract class AbstractTemplate {

    protected state: AppState

    constructor(state: AppState) {
        this.state = state
    }

    abstract buildActions(): Promise<Action[]>

    buildGasAction(): SpendFromAccount {
        return getGasAction(this.state)
    }

    buildUnSpendOutputAction(): SpendUnspentOutput {
        return getSpendUnspentOutputAction(this.state)
    }

    buildSpendAccountAction(asset_id: string, amount: number, account_id: string): SpendFromAccount {
        return {
            assetId: asset_id,
            amount: amount,
            accountId: account_id,
            type: "spendFromAccount"
        } as SpendFromAccount
    }

    buildRecipientAction(asset_id: string, amount: number, control_program: string): ControlWithProgram {
        return {
            assetId: asset_id,
            amount: amount,
            controlProgram: control_program,
            type: "controlWithProgram"
        } as ControlWithProgram
    }

    getPaymentInfo() {
        const clauseInfo = getSelectedClause(this.state)
        if (clauseInfo.values.length != 2) {
            throw "the clause's value is invalid"
        }
        const paymentId = "clauseValue." + clauseInfo.name + "." + clauseInfo.values[0].name + ".valueInput."
        const spendInputMap = getSpendInputMap(this.state)
        const paymentAccountId = spendInputMap[paymentId + "accountInput"].value
        const paymentAssetId = spendInputMap[paymentId + "assetInput"].value
        const paymentAmount = parseInt(spendInputMap[paymentId + "amountInput"].value)
        return { paymentAccountId, paymentAssetId, paymentAmount }
    }

    getDestinationInfo() {
        const contract = getSpendContract(this.state)
        const assetId = contract.assetId
        const amount = contract.amount
        const spendInputMap = getSpendInputMap(this.state)
        const accountId = spendInputMap["unlockValue.accountInput"].value
        return { accountId, assetId, amount }
    }
}

export class UnlockValueTemplate extends AbstractTemplate {

    buildActions(): Promise<Action[]> {
        const actions: Action[] = []
        actions.push(this.buildUnSpendOutputAction())

        const { accountId, assetId, amount } = this.getDestinationInfo()
        return client.createReceiver(accountId).then((receiver) => {
            actions.push(this.buildRecipientAction(assetId, amount, receiver.control_program))
            actions.push(this.buildGasAction())
            return actions
        })
    }
}

export class LockValueWithProgramTemplate extends AbstractTemplate {

    private controlProgram: string

    constructor(state: AppState, controlProgram: string) {
        super(state)
        this.controlProgram = controlProgram
    }

    buildActions(): Promise<Action[]> {
        return new Promise((resolve) => {
            const actions: Action[] = []
            actions.push(this.buildUnSpendOutputAction())

            const contract = getSpendContract(this.state)
            const assetId = contract.assetId
            const amount = contract.amount

            actions.push(this.buildRecipientAction(assetId, amount, this.controlProgram))
            actions.push(this.buildGasAction())
            resolve(actions)
        })
    }
}

export class LockPaymentUnlockValueTemplate extends AbstractTemplate {

    private controlProgram: string

    constructor(state: AppState, controlProgram: string) {
        super(state)
        this.controlProgram = controlProgram
    }

    buildActions(): Promise<Action[]> {
        const actions: Action[] = []
        actions.push(this.buildUnSpendOutputAction())

        const { paymentAccountId, paymentAssetId, paymentAmount } = this.getPaymentInfo()
        actions.push(this.buildRecipientAction(paymentAssetId, paymentAmount, this.controlProgram))
        actions.push(this.buildSpendAccountAction(paymentAssetId, paymentAmount, paymentAccountId))

        actions.push(this.buildGasAction())

        const { accountId, assetId, amount } = this.getDestinationInfo()
        return client.createReceiver(accountId).then((receiver) => {
            actions.push(this.buildRecipientAction(assetId, amount, receiver.control_program))
            return actions
        })
    }
}

export class LockPaymentLockValueTemplate extends AbstractTemplate {

    private controlProgram: string

    constructor(state: AppState, controlProgram: string) {
        super(state)
        this.controlProgram = controlProgram
    }

    buildActions(): Promise<Action[]> {
        return new Promise<Action[]>(() => {
            const actions: Action[] = []
            actions.push(this.buildUnSpendOutputAction())

            const { paymentAccountId, paymentAssetId, paymentAmount } = this.getPaymentInfo()
            actions.push(this.buildRecipientAction(paymentAssetId, paymentAmount, this.controlProgram))

            const { accountId, assetId, amount } = this.getDestinationInfo()
            return client.createReceiver(accountId).then((receiver) => {
                actions.push(this.buildRecipientAction(assetId, amount, receiver.control_program))
                actions.push(this.buildSpendAccountAction(paymentAssetId, paymentAmount, paymentAccountId))
                actions.push(this.buildGasAction())
                return actions
            })
        })
    }
}

export function getActionBuildTemplate(type: string, state: AppState): AbstractTemplate {
    switch (type) {
        case "LockWithPublicKey.spend":
        case "LockWithPublicKeyHash.spend":
        case "LockWithMultiSig.spend":
        case "TradeOffer.cancel":
        case "RevealPreimage.reveal":
            return new UnlockValueTemplate(state)
        case "Escrow.approve":
            console.log("find template")
            return new LockValueWithProgramTemplate(state, getSpendContractArgs(state)[2])
        case "Escrow.reject":
            return new LockValueWithProgramTemplate(state, getSpendContractArgs(state)[1])
        case "CallOption.expire":
            return new LockValueWithProgramTemplate(state, getSpendContractArgs(state)[2])
        case "LoanCollateral.default":
            return new LockValueWithProgramTemplate(state, getSpendContractArgs(state)[3])
        case "TradeOffer.trade":
        case "CallOption.exercise":
            return new LockPaymentUnlockValueTemplate(state, getSpendContractArgs(state)[2])
        case "LoanCollateral.repay":
            return new LockPaymentLockValueTemplate(state, getSpendContractArgs(state)[3])
        default:
            throw "can not find action build template. type:" + type
    }
}