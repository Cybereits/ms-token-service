import web3 from '../framework/web3'
import { getTokenBalanceFullInfo } from '../utils/token'
import { deployOwnerAddr } from '../config/const'

async function creatAccount(ctx) {
  let connect = await web3.onWs
  let [newAccount, code, msg] = ['', 200, '']

  try {
    code = 200
    newAccount = await connect.eth.personal.newAccount()
  } catch (error) {
    code = -1
    msg = error.toString()
  }

  ctx.body = {
    code,
    newAccount,
    msg,
  }
}

async function listAccounts(ctx) {
  let connect = await web3.onWs
  let [listAccounts, code, msg] = [[], 200, '']
  try {
    code = 200
    listAccounts = await connect.eth.getAccounts()
  } catch (error) {
    code = -1
    msg = error.toString()
  }

  ctx.body = {
    code,
    listAccounts,
    msg,
  }
}

async function getBalance(ctx) {
  let { address } = ctx.query
  let connect = await web3.onWs
  let [user, code, msg, balance] = [{}, 200, '', '']
  try {
    code = 200
    balance = await connect.eth.getBalance(address)
    balance = connect.eth.extend.utils.fromWei(balance, 'ether')
    user = {
      address,
      balance,
    }
  } catch (error) {
    code = -1
    msg = error.toString()
  }

  ctx.body = {
    code,
    user,
    msg,
  }
}

async function queryTokenBalance(ctx) {
  let { address } = ctx.query
  let result = await getTokenBalanceFullInfo(address)
  ctx.body = result
}

async function queryOfficialTokenBalance(ctx) {
  let result = await getTokenBalanceFullInfo(deployOwnerAddr)
  ctx.body = result
}

export default {
  creatAccount,
  listAccounts,
  getBalance,
  queryTokenBalance,
  queryOfficialTokenBalance,
}
