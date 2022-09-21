//npx nightwatch clicky.js

module.exports = {
  CLICKY: async function (browser) {
    let daily_amount = 0;
    let we_spent = 0;
    let is_daily_good;
    let value = 0;
    let value_is_good = false;
    let voucherToBuy = '';
    const voucherRow = "div.SubTab.MealTab.Row";
    const orderRow = "div.MealListRow:nth-of-type(1)";

    const supersConfig = {
      RAMI: {
        searchText: "רמי",
        voucherKey: "rami",
      },
      SHUFERSAL: {
        searchText: "שופרסל",
        voucherKey: "shufer",
      },
      VICTORY: {
        searchText: "ויקטורי",
        voucherKey: "victory",
      }
    }
    
    const checkPopup = async () => {
      const popup = '#divClose';
      return await browser.element('css selector', popup, async function(result){
        if(result.status != -1) {
          await browser.click(popup);
          return true;
        }
        return true;
    });
    }

    const checkShekels = async () => {
      return await browser
      .url("https://www.goodi.co.il/")
      .assert.visible("input[id=txbLoginUserName]")
      .setValue("input[id=txbLoginUserName]", browser.globals.goodi_user)
      .assert.visible("input[id=txbPassword]")
      .setValue("input[id=txbPassword]", browser.globals.goodi_pass)
      .assert.visible("input[id=divSubmitLogin]")
      .click("input[id=divSubmitLogin]")
      .waitForElementVisible("#UCLeftAmount", 10000)
      .getText("#UCLeftAmount", function (result) {
          if (result.value) {
            daily_amount = parseInt(result.value.replace("₪", ""));
            if (!isNaN(daily_amount)) {
              is_daily_good = daily_amount === 150;
            }
          }
          this.assert.equal(
            true,
            is_daily_good,
            `if enough shekels: ${daily_amount}`
          );
        });
    };

    const isReady = async () => {
      const startTime =  new Date();
      let id;
      let foundIt = false;
      const ready = "#divNoSearchResultMessage";
      const onElement = (result) => {
        if(result.status === -1) {
          foundIt = true;
        } 
      }
      

      return new Promise ((resolve, reject) => {
        const checkElement = () => {
          browser.element('css selector', ready, onElement);
          let timeDiff =  new Date() - startTime; //in ms 
          let seconds = Math.round(timeDiff/= 1000);
          console.log(`Waiting for list to load, ${seconds} have passed`);
          if (foundIt) {
            resolve(true);
            clearInterval(id);
          }
        }
        id = setInterval(checkElement, 3000)
      });
    }

    const closeTabs = async () => {
      const closeTab = () => {
        $('#tabAllRestaurants').click() 
      };
      await browser
      .execute(closeTab, [])
      .pause(5000);
      return true;
    }

    const goToTakeAway = async () => {
      await browser
      .assert.visible("div[id=divTioTakAwayTab]")
      .click("div[id=divTioTakAwayTab]");
      await isReady();
      await browser.assert.visible("input[id=txbInnerHomeSearch]");
    }
    
    const checkSupers = async () => {
      const supers = browser.globals.supermarkets.split(',');
      for (let index = 0; index < supers.length; index++) {
        const market = supers[index];
        if (voucherToBuy !== '') {
          break;
        }
        if (index > 0) {
          await closeTabs();
        }
        await goToTakeAway();
        await checkSuper(supersConfig[market])
      }
    }

    const jqWaitNClickElement = (element, done) => {
      const wait_until_element_appear = setInterval(() => {
        if ($(element).length !== 0) {
            $(element).click();
            done(element);
            clearInterval(wait_until_element_appear);
        }
      }, 0);
    }

    const isValueGood = (result) => {
      if (result.value) {
        value = parseInt(result.value);
        if (!isNaN(value)) {
          console.log('is value good', value);
          value_is_good = value && value < parseInt(browser.globals.max_amount);
          return value_is_good;
        }
      }
      value_is_good = false;
      return value_is_good;
    }

    const consoleResult = (result) => {
      console.log(`consoleResult ${JSON.stringify(result)}`);
      return true;
    };

    const checkSuper = async (market) => {
      const enterSearch = (searchText, done) => {
        console.log('enterSearch');
        $("#txbInnerHomeSearch").focus().val(searchText).trigger("keyup");
        if ($('.RLOuterRow:visible:first').length){
          $('.RLOuterRow:visible:first img').click();
        }
        setTimeout(done, 2000, 'checkSuper');
      };

      const openVoucherRow = ({voucherRow}, done) => {
        if ($(voucherRow).length){
          $(voucherRow).click();
        }
        setTimeout(done, 2000, 'openVoucherRow');
      };

      const getVoucher = ({orderRow}, done) => {
        const value = $(`${orderRow} .RLMealPrice`).html();
        setTimeout(done, 2000, value);
      };

      const setVoucher = (result) => {
        isValueGood(result);
        if(value_is_good){
          voucherToBuy = market.voucherKey;
        }
        return true;
      };

      await browser
      .executeAsync(enterSearch, [market.searchText], consoleResult)
      .executeAsync(openVoucherRow, [{voucherRow}], consoleResult)
      .executeAsync(jqWaitNClickElement, [orderRow], consoleResult)
      .executeAsync(getVoucher, [{orderRow}], setVoucher)
    }

    const completeOrder = async () => {
      await browser
      .click(`${orderRow} .OrderButton`)
      .waitForElementVisible('#divOrderButton', 10000)
      .executeAsync(jqWaitNClickElement, ['#divOrderButton'], consoleResult)
      .executeAsync(jqWaitNClickElement, ['.divSendOrdders'], consoleResult)
      .pause(10000)
      .getText("#UCLeftAmount", function (result) {
        if (result.value) {
          we_spent = parseInt(result.value.replace("₪", ""));
          if (isNaN(we_spent)) {
            we_spent = 0
          }
        }
        this.assert.equal(
          true,
          (150 - we_spent > 0),
          `we didn't spend anything: ${we_spent}`
        );
      });
      
      return true;
    };
      
    
    await checkPopup();
    await checkShekels();
    await checkSupers();
    
    if (voucherToBuy !== '') {
      await completeOrder();
    } 
   
    browser.saveScreenshot("./screenshots/yo.png");
  },
};
