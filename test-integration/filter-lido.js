/* global artifacts */

const { assert, expect } = require("chai");
const utils = require("../utils/utilities.js");
const { deployArgent } = require("../utils/argent-deployer.js");

const LidoFilter = artifacts.require("LidoFilter");
const CurveFilter = artifacts.require("CurveFilter");
const ILido = artifacts.require("ILido");
const ICurvePool = artifacts.require("ICurvePool");

contract("Lido Filter", (accounts) => {
  let argent;
  let wallet;

  let other;
  let lido;
  let curve;

  before(async () => {
    argent = await deployArgent(accounts);
    [other] = argent.freeAccounts;

    lido = await ILido.at("0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84");
    curve = await ICurvePool.at("0xdc24316b9ae028f1497c275eb9192a3ea0f67022");

    const lidoFilter = await LidoFilter.new();
    const curveFilter = await CurveFilter.new();

    await argent.dappRegistry.addDapp(0, lido.address, lidoFilter.address);
    await argent.dappRegistry.addDapp(0, curve.address, curveFilter.address);
  });

  beforeEach(async () => {
    wallet = await argent.createFundedWallet();
  });

  describe("Lido staking", () => {
    it("should allow staking from wallet via fallback", async () => {
      const { success, error } = await argent.multiCall(wallet, [utils.encodeTransaction(lido.address, 100, "0x")]);
      assert.isTrue(success, `deposit failed: "${error}"`);

      const walletBalance = await lido.balanceOf(wallet.address);
      assert.closeTo(walletBalance.toNumber(), 99, 1);
    });

    it("should allow staking from wallet via submit", async () => {
      const { success, error } = await argent.multiCall(wallet, [
        [lido, "submit", [other], 100]
      ]);
      assert.isTrue(success, `deposit failed: "${error}"`);

      const walletBalance = await lido.balanceOf(wallet.address);
      assert.closeTo(walletBalance.toNumber(), 99, 1);
    });
  });

  describe("Selling via CurvePool", () => {
    const amount = web3.utils.toWei("0.01");

    beforeEach(async () => {
      // Stake some funds to use to test selling
      await argent.multiCall(wallet, [
        [lido, "submit", [other], amount]
      ]);
    });

    it("should allow selling stETH via Curve", async () => {
      const ethBefore = await utils.getBalance(wallet.address);

      const transactions = [
        [lido, "approve", [curve.address, amount]],
        [curve, "exchange", [1, 0, amount, 1]],
      ];
      const { success, error } = await argent.multiCall(wallet, transactions, { gasPrice: 0 });

      assert.isTrue(success, `exchange failed: "${error}"`);

      // Check ETH was received
      const ethAfter = await utils.getBalance(wallet.address);
      expect(ethAfter.sub(ethBefore)).to.be.gt.BN(0);

      // Check only dust stETH left
      const lidoAfter = await lido.balanceOf(wallet.address);
      expect(lidoAfter).to.be.lt.BN(10);
    });
  });
});
