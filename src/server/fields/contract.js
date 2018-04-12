import abi from 'ethereumjs-abi'
import { GraphQLString as str } from 'graphql'
import solc from 'solc'
import fs from 'fs'
import path from 'path'

import {
  deployOwnerAddr,
  deployOwnerSecret,
  tokenSupply,
  contractDecimals,
  teamLockPercent,
  teamAddr01,
  teamAddr02,
  teamAddr03,
  teamAddr04,
  teamAddr05,
  teamAddr06,
} from '../../config/const'

import {
  seriliazeContractData,
  updateContractData,
  createAndDeployContract,
} from '../../utils/contract'

export const queryContractAbi = {
  type: str,
  description: '查询代币合约 abi',
  resolve() {
    let result = abi.rawEncode(
      [
        'uint256',
        'uint256',
        'uint256',
        'address',
        'address',
        'address',
        'address',
        'address',
        'address',
      ],
      [
        tokenSupply,
        contractDecimals,
        teamLockPercent,
        teamAddr01,
        teamAddr02,
        teamAddr03,
        teamAddr04,
        teamAddr05,
        teamAddr06,
      ],
    )
    return result.toString('hex')
  },
}

// todo
// 部署合约应该以调用时传入的形式
// 并且应该可以支持多个合约
export const deployTokenContract = {
  type: str,
  description: '部署代币、锁仓合约',
  async resolve() {
    const contractName = 'token'
    const name = 'Cybereits Token'
    const meta = {
      sources: {
        'CybereitsToken.sol': fs.readFileSync(path.resolve(__dirname, '../../../contracts/CybereitsToken.sol')).toString(),
      },
      settings: {
        optimizer: {
          enabled: true,
          runs: 500,
        },
      },
    }

    // 编译合约
    const output = solc.compile(meta, 1)

    let errCounter = 0
    let contractCode = []
    let contractAbi = []

    if (output.errors) {
      output.errors.forEach((err) => {
        console.log(err)
        if (~err.indexOf('Error')) {
          errCounter += 1
        }
      })
    }

    if (errCounter === 0) {
      Object
        .keys(output.contracts)
        .forEach((contractName) => {
          contractCode.push(output.contracts[contractName].bytecode)
          contractAbi.push(output.contracts[contractName].interface)
        })

      // 持久化合约信息
      await seriliazeContractData(contractName, {
        name,
        createTimeStamp: Date.now(),
        code: contractCode,
        abi: contractAbi,
      }).catch((err) => {
        throw new Error(`合约编译失败 ${err.message}`)
      })

      return createAndDeployContract(
        `0x${contractCode[1]}`,
        JSON.parse(contractAbi[1]),
        deployOwnerAddr,
        deployOwnerSecret,
        // 合约第1个参数 代币总量
        // 合约第2个参数 decimals
        // 合约第3个参数 团队锁定份额 百分比:0-100
        // 合约第4-9个参数 团队地址1-6
        [
          tokenSupply,
          contractDecimals,
          teamLockPercent,
          teamAddr01,
          teamAddr02,
          teamAddr03,
          teamAddr04,
          teamAddr05,
          teamAddr06,
        ]
      )
        .then(async ([compiledContract, contractInstance]) => {
          console.log('合约部署成功!')
          // console.log('compiledContract', compiledContract.methods)
          let lockContractAddr = await compiledContract
            .methods
            .teamLockAddr()
            .call(null)

          await updateContractData(contractName, (data) => {
            let temp = data
            temp.address = [contractInstance.options.address]
            temp.subContractAddress = [lockContractAddr]
            return temp
          })

          return 'success'
        })
        .catch((err) => {
          throw new Error(`合约部署失败 ${err.message}`)
        })
    } else {
      throw new Error('合约编译失败')
    }
  },
}