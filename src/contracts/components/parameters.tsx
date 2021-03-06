import * as React from 'react'
import { connect } from 'react-redux'
import { typeToString } from '../types'

import { getshowLockInputMessages, getParameterIds, getInputMap, getContractValueId } from '../../templates/selectors'

import RadioSelect from '../../app/components/radioSelect'
import { Item as Asset } from '../../assets/types'
import { getItemMap as getAssetMap, getItemList as getAssets } from '../../assets/selectors'
import { Item as Account } from '../../accounts/types'
import { getBalanceMap, getItemList as getAccounts, getBalanceSelector } from '../../accounts/selectors'
import { getState as getContractsState, getClauseValueId, getRequiredAssetAmount } from '../../contracts/selectors'
import { BTM_ASSET_ID } from '../../contracts/constants'
import {
  Input, InputContext, ParameterInput, NumberInput, StringInput,
  ProvideStringInput, GenerateStringInput, HashInput,
  TimeInput,
  PublicKeyInput, ProvidePublicKeyInput, GenerateHashInput,
  ProvideHashInput, InputType, ComplexInput,
  ProvideSignatureInput, ProvidePrivateKeyInput,
  ValueInput, AccountAliasInput, AssetAliasInput, AssetInput, AmountInput,
  ProgramInput, ChoosePublicKeyInput, KeyData, SignatureInput
} from '../../inputs/types'
import {
  validateInput, computeDataForInput, getChild,
  getParameterIdentifier, getInputContext
} from '../../inputs/data'

import { updateInput, updateClauseInput } from '../actions'
import { getShowUnlockInputErrors, getSpendInputMap, getClauseParameterIds } from '../selectors'

function getChildWidget(input: ComplexInput) {
  return getWidget(getChild(input))
}

function ParameterWidget(props: { input: ParameterInput, handleChange: (e) => undefined }) {
  // handle the fact that clause arguments look like spend.sig rather than sig
  const parameterName = getParameterIdentifier(props.input)
  const valueType = typeToString(props.input.valueType)
  return (
    <div key={props.input.name}>
      <label>{parameterName}: <span className='type-label'>{valueType}</span></label>
      {getChildWidget(props.input)}
    </div>
  )
}

function mapToInputProps(showError: boolean, inputsById: { [s: string]: Input }, id: string) {
  const input = inputsById[id]
  const inputContext = id.split(".")[0]
  if (input === undefined) {
    throw "bad input ID: " + id
  }

  let errorClass = ''
  const hasInputError = !validateInput(input)
  if (showError && hasInputError) {
    errorClass = 'has-error'
  }
  if (input.type === "generateSignatureInput") {
    return {
      input,
      errorClass,
      computedValue: "",
    }
  }

  return {
    input,
    inputContext,
    errorClass
  }
}

function mapStateToContractInputProps(state, ownProps: { id: string }) {
  const inputMap = getInputMap(state)
  if (inputMap === undefined) {
    throw "inputMap should not be undefined when contract inputs are being rendered"
  }
  const showError = getshowLockInputMessages(state)
  const lang= state.lang
  return Object.assign({},mapToInputProps(showError, inputMap, ownProps.id), {lang})
}

const AccountAliasWidget = connect(
  (state) => ({ accounts: getAccounts(state),lang: state.lang })
)(AccountAliasWidgetUnconnected)

function AccountAliasWidgetUnconnected(props: {
  input: AccountAliasInput,
  lang: string,
  errorClass: string,
  handleChange: (e) => undefined,
  accounts: Account[]
}) {
  const lang = props.lang
  const options = props.accounts.map(account => <option key={account.id} value={account.id}>{account.alias}</option>)
  if (options.length === 0) {
    options.push(<option key="" value="">{ lang ==='zh'? '没有可用账户信息' :'No Accounts Available'}</option>)
  } else {
    options.unshift(<option key="" value="">{ lang ==='zh'? '请选择账户' :'Select Account'}</option>)
  }
  return (
    <div className={"form-group " + props.errorClass}>
      <div className="input-group">
        <div className="input-group-prepend">
          <span className="input-group-text">{ lang==='zh'? '账户':'Account' }</span>
        </div>
        <select id={props.input.name} className="form-control with-addon"
          value={props.input.value} onChange={props.handleChange}>
          {options}
        </select>
      </div>
    </div>
  )
}

const AssetAliasWidget = connect(
  (state) => ({ assets: getAssets(state),lang: state.lang  })
)(AssetAliasWidgetUnconnected)

const AssetAliasWithBTMWidget = connect(
  (state) => {
    const lang = state.lang
    const assets = getAssets(state)
    const assetsWithBTM: Asset[] = []
    Object.assign(assetsWithBTM, assets)
    assetsWithBTM.push({ id: BTM_ASSET_ID, alias: "BTM" })
    return { assets: assetsWithBTM, lang }
  }
)(AssetAliasWidgetUnconnected)

function AssetAliasWidgetUnconnected(props: {
  input: AssetAliasInput,
  lang: string,
  errorClass: string,
  handleChange: (e) => undefined,
  assets: Asset[]
}) {
  const lang = props.lang
  const options = props.assets.map(asset => <option key={asset.id} value={asset.id}>{asset.alias}</option>)
  if (options.length === 0) {
    options.push(<option key="" value="">{ lang ==='zh'? '没有可用资产信息' : 'No Assets Available'}</option>)
  } else {
    options.unshift(<option key="" value="">{ lang ==='zh'? '请选择资产' : 'Select Asset'}</option>)
  }
  return (
    <div className={"form-group " + props.errorClass}>
      <div className="input-group">
        <div className="input-group-prepend"><span className="input-group-text">{ lang==='zh'? '资产': 'Asset' }</span></div>
        <select id={props.input.name} className="form-control with-addon"
          value={props.input.value} onChange={props.handleChange}>
          {options}
        </select>
      </div>
    </div>
  )
}

function AssetWidget(props: { input: AssetInput, lang: string, inputContext: InputContext, handleChange: (e) => undefined }) {
  const lang = props.lang
  const options = [{ label: lang==='zh'?'选择资产':"Generate Asset", value: (props.inputContext === "contractValue" || props.inputContext === "clauseParameters")? "assetAliasInput" : "assetAliasWithBTMInput" },
  { label:lang==='zh'?'输入资产ID':"Provide Asset Id", value: "provideStringInput" }]
  const handleChange = (s: string) => undefined
  return (
    <div className="input-group flex-column">
      <RadioSelect options={options} selected={props.input.value} name={props.input.name} handleChange={props.handleChange} />
      {getChildWidget(props.input)}
    </div>
  )
}

function NumberWidget(props: {
  input: NumberInput | AmountInput,
  handleChange: (e) => undefined
}) {
  return <input type="text" className="form-control" style={{ width: 200 }} key={props.input.name}
    value={props.input.value} onChange={props.handleChange} />
}

function PasswordWidget(props: {
  input: StringInput,
  errorClass: string,
  lang: string,
  handleChange: (e) => undefined
}) {
  return (
    <div className={"form-group " + props.errorClass}>
      <div className="input-group">
        <div className="input-group-prepend"><span className="input-group-text">{props.lang==='zh'? '密码' :'Password'}</span></div>
        <input type="password" className="form-control" style={{ width: 200 }} key={props.input.name}
          value={props.input.value} onChange={props.handleChange} />
      </div>
    </div>
  )
}

function GasWidget(props: {
  input: AmountInput,
  errorClass: string,
  handleChange: (e) => undefined
}) {
  return (
    <div className={"form-group " + props.errorClass}>
      <div className="input-group" style={{ width: 400 }} >
        <div className="input-group-prepend">
          <span className="input-group-text">Gas</span>
        </div>
        <input id="gasInput" type="text" className="form-control" key={props.input.name} style={{ width: 200 }}
          value={props.input.value} onChange={props.handleChange} />
        <div className="input-group-prepend">
          <span className="input-group-text">{getWidget(props.input.name + ".btmUnitInput")}</span>
        </div>
      </div>
    </div>
  )
}

function BtmUnitWidget(props: {
  input: StringInput,
  handleChange: (e) => undefined
}) {
  return (
    <div>
      <select
        id="gas-unit"
        key={props.input.name}
        value={props.input.value}
        onChange={props.handleChange}
        style={{
          minWidth: '70px',
          border: 'none'
        }}
      >
        <option value="btm">BTM</option>
        <option value="mbtm">mBTM</option>
        <option value="neu">NEU</option>
      </select>
    </div>
  )
}

function SignatureWidget(props: { input: SignatureInput, handleChange: (e) => undefined }) {
  return (
    <div>
      {getWidget(props.input.name + ".accountInput")}
    </div>
  )
}

function AmountWidget(props: {
  input: AmountInput,
  lang: string,
  errorClass: string,
  handleChange: (e) => undefined
}) {
  return (
    <div className={"form-group " + props.errorClass}>
      <div className="input-group">
        <div className="input-group-prepend"><span className="input-group-text">{props.lang==='zh'? '数量' :'Amount'}</span></div>
        <NumberWidget input={props.input} handleChange={props.handleChange} />
      </div>
    </div>
  )
}

function mapDispatchToContractInputProps(dispatch, ownProps: { id: string }) {
  return {
    handleChange: (e) => {
      dispatch(updateInput(ownProps.id, e.target.value.toString()))
    }
  }
}

export function getWidget(id: string): JSX.Element {
  const inputContext = id.split(".").shift() as InputContext
  const type = id.split(".").pop() as InputType
  let widgetTypeConnected
  if (inputContext === "contractParameters" || inputContext === "contractValue") {
    widgetTypeConnected = connect(
      mapStateToContractInputProps,
      mapDispatchToContractInputProps
    )(getWidgetType(type))
  } else {
    widgetTypeConnected = connect(
      mapStateToSpendInputProps,
      mapDispatchToSpendInputProps
    )(getWidgetType(type))
  }
  return (
    <div className="widget-wrapper" key={"container(" + id + ")"}>
      {React.createElement(widgetTypeConnected, { key: "connect(" + id + ")", id: id })}
    </div>
  )
}

function TextWidget(props: {
  input: ProvideStringInput | ProvideHashInput |
  ProvidePublicKeyInput | ProvideSignatureInput |
  ProvidePrivateKeyInput,
  errorClass: string,
  handleChange: (e) => undefined
}) {
  return (
    <div className={"form-group " + props.errorClass}>
      <input type="text" key={props.input.name} className="form-control string-input" value={props.input.value} onChange={props.handleChange} />
    </div>
  )
}

function PublicKeyWidget(props: {
  input: PublicKeyInput,
  lang: string,
  handleChange: (e) => undefined
}) {
  const lang = props.lang
  const options = [{ label: lang==='zh'? '生成公钥': "Generate Public Key", value: "accountInput" },
  { label: lang ==='zh'?'输入公钥':"Provide Public Key", value: "provideStringInput" }]
  const handleChange = (s: string) => undefined
  return (
    <div>
      <RadioSelect options={options} selected={props.input.value} name={props.input.name} handleChange={props.handleChange} />
      {getChildWidget(props.input)}
    </div>
  )
}

function HashWidget(props: { input: HashInput, lang:string, handleChange: (e) => undefined }) {
  const lang = props.lang
  const options = [{ label: lang==='zh'?'生成Hash':"Generate Hash", value: "generateHashInput" },
  { label: lang==='zh'?'提供Hash' :"Provide Hash", value: "provideHashInput" }]
  const handleChange = (s: string) => undefined
  return (
    <div>
      <RadioSelect options={options} selected={props.input.value} name={props.input.name} handleChange={props.handleChange} />
      {getChildWidget(props.input)}
    </div>
  )
}

function mapStateToSpendInputProps(state, ownProps: { id: string }) {
  const inputsById = getSpendInputMap(state)
  const showError = getShowUnlockInputErrors(state)
  const lang = state.lang
  return Object.assign({},mapToInputProps(showError, inputsById, ownProps.id), {lang})
}

function mapDispatchToSpendInputProps(dispatch, ownProps: { id: string }) {
  return {
    handleChange: (e) => {
      dispatch(updateClauseInput(ownProps.id, e.target.value.toString()))
    }
  }
}

function mapToComputedProps(state, ownProps: { computeFor: string }) {
  const inputsById = getInputMap(state)
  if (inputsById === undefined) throw "inputMap should not be undefined when contract inputs are being rendered"
  const input = inputsById[ownProps.computeFor]
  if (input === undefined) throw "bad input ID: " + ownProps.computeFor
  if (input.type === "generateHashInput" ||
    input.type === "generateStringInput") {
    try {
      let computedValue = computeDataForInput(ownProps.computeFor, inputsById)
      return {
        value: computedValue
      }
    } catch (e) {
      return {}
    }
  }
}

const ComputedValue = connect(
  mapToComputedProps,
)(ComputedValueUnconnected)

function ComputedValueUnconnected(props: { value: string }) {
  return props.value ? <pre>{props.value}</pre> : <span />
}

function GenerateHashWidget(props: {
  id: string,
  input: GenerateHashInput,
  handleChange: (e) => undefined
}) {
  return (
    <div>
      <ComputedValue computeFor={props.id} />
      <div className="nested">
        <div className="description">{props.input.hashType.hashFunction} of:</div>
        <label className="type-label">{typeToString(props.input.hashType.inputType)}</label>
        {getChildWidget(props.input)}
      </div>
    </div>
  )
}

function ProgramWidget(props: { input: ProgramInput, lang:string, handleChange: (e) => undefined }) {
  const lang = props.lang
  const options = [{ label: lang==='zh'?'生成合约程序':"Generate Program", value: "accountInput" },
  { label: lang==='zh'?'输入合约程序':"Provide Program", value: "provideStringInput" }]
  const handleChange = (s: string) => undefined
  return (
    <div>
      <RadioSelect options={options} selected={props.input.value} name={props.input.name} handleChange={props.handleChange} />
      {getChildWidget(props.input)}
    </div>
  )
}

function TimeWidget(props: { input: TimeInput, handleChange: (e) => undefined }) {
  return <div>{getChildWidget(props.input)}</div>
}

function TimestampTimeWidget(props: {
  input: TimeInput,
  errorClass: string,
  handleChange: (e) => undefined
}) {
  return (
    <div className={"form-group " + props.errorClass}>
      <input type="datetime-local" placeholder="yyyy-mm-ddThh:mm:ss" key={props.input.name} className="form-control" value={props.input.value} onChange={props.handleChange} />
    </div>
  )
}

function ChoosePublicKeyWidget(props: {
  input: ChoosePublicKeyInput,
  errorClass: string,
  handleChange: (e) => undefined
}) {
  if (props.input.keyMap === undefined) {
    throw 'keyMap is undefined'
  }

  const options: any[] = []
  const map: { [s: string]: KeyData } = props.input.keyMap
  for (const key in map) {
    options.push(<option key={key} value={key}>{key}</option>)
  }
  options.unshift(<option key="" value="">Select Public Key</option>)

  return (
    <div className={"form-group " + props.errorClass}>
      <div className="input-group">
        <div className="input-group-prepend"><span className="input-group-text">Public Key</span></div>
        <select id={props.input.name} className="form-control with-addon" value={props.input.value} onChange={props.handleChange}>
          {options}
        </select>
      </div>
    </div>
  )
}

function StringWidget(props: { input: StringInput, handleChange: (e) => undefined }) {
  const handleChange = (s: string) => undefined
  return (
    <div>
      {getChildWidget(props.input)}
    </div>
  )
}

function GenerateStringWidget(props: {
  id: string,
  input: GenerateStringInput,
  errorClass: string,
  handleChange: (e) => undefined
}) {
  return (
    <div>
      <div className={"input-group " + props.errorClass}>
        <div className="input-group-prepend"><span className="input-group-text">Length</span></div>
        <input type="text" className="form-control" style={{ width: 200 }} key={props.input.name} value={props.input.value} onChange={props.handleChange} />
      </div>
      <ComputedValue computeFor={props.id} />
    </div>
  )
}

function getWidgetType(type: InputType): ((props: { input: Input, lang: string, handleChange: (e) => undefined }) => JSX.Element) {
  switch (type) {
    case "numberInput": return NumberWidget
    // case "booleanInput": return BooleanWidget
    case "stringInput": return StringWidget
    case "generateStringInput": return GenerateStringWidget
    case "provideOriginInput":
    case "provideStringInput": return TextWidget
    case "publicKeyInput": return PublicKeyWidget
    // case "generateSignatureInput": return GenerateSignatureWidget
    // case "generatePublicKeyInput": return GeneratePublicKeyWidget
    // case "generatePrivateKeyInput": return GeneratePrivateKeyWidget
    case "providePublicKeyInput": return TextWidget
    // case "providePrivateKeyInput": return TextWidget
    // case "provideSignatureInput": return TextWidget
    case "hashInput": return HashWidget
    case "provideHashInput": return TextWidget
    case "generateHashInput": return GenerateHashWidget
    case "timeInput": return TimeWidget
    case "timestampTimeInput": return TimestampTimeWidget
    case "valueInput": return ValueWidget
    case "accountInput": return AccountAliasWidget
    case "assetAliasInput": return AssetAliasWidget
    case "assetAliasWithBTMInput": return AssetAliasWithBTMWidget
    case "assetInput": return AssetWidget
    case "amountInput": return AmountWidget
    case "programInput": return ProgramWidget
    case "gasInput": return GasWidget
    case "btmUnitInput": return BtmUnitWidget
    case "passwordInput": return PasswordWidget
    case "signatureInput": return SignatureWidget
    case "choosePublicKeyInput": return ChoosePublicKeyWidget
    default: return ParameterWidget
  }
}

const InsufficientFundsAlert = connect(
  (state, ownProps: { namePrefix: string }) => ({
    balance: getBalanceSelector(ownProps.namePrefix)(state),
    inputMap: getInputMap(state),
    contracts: getContractsState(state)
  })
)(InsufficientFundsAlertUnconnected)

function InsufficientFundsAlertUnconnected({ namePrefix, balance, inputMap, contracts }) {
  let amountInput
  if (namePrefix.startsWith("contract")) {
    amountInput = inputMap[namePrefix + ".amountInput"]
  } else if (namePrefix.startsWith("clause")) {
    // THIS IS A HACK
    const spendInputMap = contracts.contractMap[contracts.utxoId].spendInputMap
    amountInput = spendInputMap[namePrefix + ".valueInput.amountInput"]
  }
  let jsx = <small />
  if (balance !== undefined && amountInput && amountInput.value) {
    if (balance < amountInput.value) {
      jsx = (
        <div style={{ width: '300px' }} className="alert alert-danger" role="alert">
          Insufficient Funds
        </div>
      )
    }
  }
  return jsx
}

const BalanceWidget = connect(
  (state, ownProps: { namePrefix: string }) => ({ balance: getBalanceSelector(ownProps.namePrefix)(state) ,lang: state.lang})
)(BalanceWidgetUnconnected)

function BalanceWidgetUnconnected({ namePrefix, balance, lang }) {
  let jsx = <small />
  if (balance !== undefined) {
    jsx = <small className="value-balance">{balance} {lang==='zh'?'可用':'available'}</small>
  }
  return jsx
}

function ValueWidget(props: { input: ValueInput,  handleChange: (e) => undefined }) {
  return (
    <div>
      {/*<EmptyCoreAlert />*/}
      <InsufficientFundsAlert namePrefix={props.input.name} />
      {getWidget(props.input.name + ".accountInput")}
      {getWidget(props.input.name + ".assetInput")}
      {getWidget(props.input.name + ".amountInput")}
      <BalanceWidget namePrefix={props.input.name}/>
      {getWidget(props.input.name + ".passwordInput")}
      {getWidget(props.input.name + ".gasInput")}
    </div>
  )
}

function mapStateToContractValueProps(state) {
  return {
    valueId: getContractValueId(state)
  }
}

export const ContractValue = connect(
  mapStateToContractValueProps
)(ContractValueUnconnected)

function ContractValueUnconnected(props: { valueId: string }) {
  if (props.valueId === undefined) {
    return <div></div>
  }
  return (
    <section style={{ wordBreak: 'break-all' }}>
      <form className="form">
        <div className="argument">
          {getWidget(props.valueId)}
          {/*<ValueWidget/>*/}
        </div>
      </form>
    </section>
  )
}

function mapStateToContractParametersProps(state) {
  return {
    parameterIds: getParameterIds(state)
  }
}

export const ContractParameters = connect(
  mapStateToContractParametersProps
)(ContractParametersUnconnected)

function ContractParametersUnconnected(props: { parameterIds: string[] }) {
  if (!props.parameterIds || props.parameterIds.length === 0) return <div />
  const parameterInputs = props.parameterIds.map((id) => {
    return <div key={id} className="argument">{getWidget(id)}</div>
  })
  return (
    <section style={{ wordBreak: 'break-all' }}>
      <form className="form">
        {parameterInputs}
      </form>
    </section>
  )
}

function mapStateToClauseValueProps(state) {
  return {
    valueId: getClauseValueId(state),
    assetMap: getAssetMap(state),
    assetAmount: getRequiredAssetAmount(state),
    balanceMap: getBalanceMap(state),
    spendInputMap: getSpendInputMap(state),
    lang: state.lang
  }
}

export const ClauseValue = connect(
  mapStateToClauseValueProps
)(ClauseValueUnconnected)

function ClauseValueUnconnected(props: { spendInputMap, balanceMap, assetAmount, assetMap, lang, valueId: string }) {
  const lang = props.lang
  if (props.valueId === undefined || props.assetAmount === undefined) {
    return <div />
  } else {
    const parameterName = props.valueId.split('.').pop()
    const valueType = "Value"
    props.spendInputMap[props.valueId + ".valueInput.assetInput"].value = props.assetAmount.assetId
    props.spendInputMap[props.valueId + ".valueInput.amountInput"].value = props.assetAmount.amount
    const asset = props.assetMap[props.assetAmount.assetId]
    return (
      <section style={{ wordBreak: 'break-all' }}>
        <h5>Required Value</h5>
        <form className="form">
          <InsufficientFundsAlert namePrefix={props.valueId} />
          {getWidget(props.valueId + ".valueInput.accountInput")}
          <div className="form-group">
            <div className="input-group">
              <div className="input-group-prepend"><span className="input-group-text">{lang==='zh'?'资产':'Asset'}</span></div>
              <input type="text" className="form-control" value={asset !== undefined ? asset.alias : props.assetAmount.assetId} disabled />
            </div>
          </div>
          <div className="form-group">
            <div className="input-group">
              <div className="input-group-prepend"><span className="input-group-text">Amount</span></div>
              <input type="text" className="form-control" value={props.assetAmount.amount} disabled />
            </div>
          </div>
          <BalanceWidget namePrefix={props.valueId} />
        </form>
      </section>
    )
  }
}

export const ClauseParameters = connect(
  (state) => ({ parameterIds: getClauseParameterIds(state) , lang: state.lang})
)(ClauseParametersUnconnected)

function ClauseParametersUnconnected(props: { parameterIds: string[] }) {
  if (props.parameterIds.length === 0) return <div />
  let parameterInputs = props.parameterIds.map((id) => {
    return <div key={id} className="argument">{getWidget(id)}</div>
  })
  return <section style={{ wordBreak: 'break-all' }}>
    <h5>{props.lang ==='zh'?'函数参数':'Clause Arguments'}</h5>
    <form className="form">
      {parameterInputs}
    </form></section>
}
