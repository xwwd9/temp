import {validate as emailValidator} from "email-validator"
import md5 from 'md5'
import sqlite3 from 'sqlite3'
import {open} from 'sqlite'


let db; // 数据库实列

/**
 * 验证密码是否符合规格
 * @param password
 * @returns {boolean}
 */
function passwordValidator(password) {
    try {
        let pLen = password.length
        if (pLen < 10 || pLen > 30) {
            return false
        }
        // 判断 大写字母，符号，小写字母，数字中的3种
        let cnt = 0
        if (password.search(/\d/) >= 0) {
            cnt += 1
        }
        if (password.search(/[A-Z]/) >= 0) {
            cnt += 1
        }
        if (password.search(/[a-z]/) >= 0) {
            cnt += 1
        }
        if (password.search(/\W/) >= 0) {
            cnt += 1
        }
        if (cnt >= 3) {
            return true
        }
        return false
    } catch (e) {
        console.log(e.message)
        return false
    }

}


/**
 * 注册函数, 使用邮箱，密码注册
 * @param body
 * {
 *     account, // 账号
 *     password, // 密码
 * }
 * @returns {Promise<void>}
 */
async function register(body) {
    try {
        let {account, password} = body
        account = account.toString()
        password = password.toString()
        let isPasswordsValid = passwordValidator(password)
        if(!isPasswordsValid){
            throw Error("密码需要：10~30位，必须至少包含：大写字母，符号，小写字母，数字中的3种")
        }
        let isAccountVaild = emailValidator(account)
        if (!isAccountVaild) {
            throw Error("请使用邮箱进行账号注册")
        }
        let passwdHashed = md5(password.toString())
        let createAt = new Date()
        await db.run(
            'INSERT INTO user (account, password, createAt) VALUES (?, ?, ?)',
            account, passwdHashed, createAt.toJSON()
        )
        console.log("注册成功")
    } catch (err) {
        if (err.message.indexOf('UNIQUE constraint failed') >= 0) {
            // 'SQLITE_CONSTRAINT: UNIQUE constraint failed: user.account'
            console.log("已经注册过该用户", err.message)
        } else {
            console.log("注册失败", err.message)
        }
    }
}

/**
 * 修改密码, 传入用户名, 旧密码, 新密码
 * @param body
 * {
 *     account,用户名
 *     oldPwd, 旧密码
 *     newPwd, 新密码
 * }
 * @returns {Promise<void>}
 */
async function updatePassword(body) {
    try {
        let {account, oldPwd, newPwd} = body
        account = account.toString()
        oldPwd = oldPwd.toString()
        newPwd = newPwd.toString()
        let isPasswordsValid = passwordValidator(newPwd)
        if(!isPasswordsValid){
            throw Error("新密码需要：10~30位，必须至少包含：大写字母，符号，小写字母，数字中的3种")
        }
        let isValid = await validateUserPassword(account, oldPwd)
        if (!isValid) {
            throw Error("用户名或密码不正确")
        }
        await db.run(
            'UPDATE user SET password = ? WHERE account = ?',
            md5(newPwd),
            account
        )
        console.log("密码修改成功")

    } catch (e) {
        console.log(e.message)
    }

}

/**
 * 验证用户名密码是否正确
 * @param account
 * @param password
 */
async function validateUserPassword(account, pwd) {
    try {
        let userInDB = await db.get('SELECT account, password FROM user WHERE account = ?', account);
        const {password: passwordInDb} = userInDB
        if (!userInDB || passwordInDb !== md5(pwd)) {
            throw Error("用户名或密码不正确")
        }
        return true
    } catch (e) {
        return false
    }
}

/**
 * 用户登录函数
 * @param body
 * {
 *     account, 用户名
 *     password, 密码
 * }
 * @returns {Promise<void>}
 */
async function login(body) {
    try {
        let {account, password} = body
        account = account.toString()
        password = password.toString()
        let isValid = await validateUserPassword(account, password)
        if (!isValid) {
            throw Error("用户名或密码不正确")
        }
        console.log("登录成功")
    } catch (e) {
        console.log(e.message)
    }

}

/**
 * 统计最近10天, 每天的注册人数
 * @returns {Promise<void>}
 */
async function statistics() {
    let temp = await db.get("SELECT count(account) as count, strftime('%Y-%m-%d',createAt) as date FROM user GROUP BY strftime('%Y-%m-%d',createAt)")
    console.log(temp)
}

(async () => {
    // open the database
    db = await open({
        filename: './database.db',
        driver: sqlite3.Database
    })
    try {
        await db.exec('CREATE TABLE user ("account" TEXT UNIQUE, "password" TEXT, "createAt" DATETIME)')
    } catch (err) {
        console.log(err.message)
    }
})().then(async () => {

    //注册用户
    await register({account: "444@qq.com", password: "1233333333aA"})

    // 登录用户
    await login({account: "444@qq.com", password: '1233333333aA'})

    // 修改密码
    await updatePassword({account: "444@qq.com", oldPwd: '1233333333aA', newPwd:
    '1233333333aA'})

    // 统计注册人数
    await statistics()

})





