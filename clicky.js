const puppeteer = require("puppeteer");
require("dotenv").config();

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

let is_daily_good = false;
let voucherToBuy = "";

let daily_amount = 0;
let we_spent = 0;
const voucherRow = "div.SubTab.MealTab.Row";

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
  },
};

const initialiseBroswer = async (browser, page) => {
  await page.setViewport({ width: 1366, height: 768 });
  page.setDefaultTimeout(0);
  await page.goto("https://www.goodi.co.il/");
  await page.waitForSelector("input[id=txbLoginUserName]");
  await page.type("input[id=txbLoginUserName]", process.env.GOODI_USER);
  await page.type("input[id=txbPassword]", process.env.GOODI_PASS);
  await page.click("input[id=divSubmitLogin]");

  await delay(4000);
  await page.waitForResponse((response) => response.ok());
  return true;
};

const closeTabs = async (page) => {
  const clearSearch = async () => {
    try {
      await page.click("#divResetSearch");
      console.log("Clear Search GOOD");
    } catch (error) {
      console.log("Clear Search NO GOOD");
      return;
    }
  };

  const closeTab = async () => {
    try {
      await page.click("#divCloseTab");
      console.log("Close Tab GOOD");
    } catch (error) {
      console.log("Close Tab NO GOOD");
      return;
    }
  };

  const closeRow = async () => {
    try {
      await page.click("#topSitting");
      console.log("Close Row GOOD");
    } catch (error) {
      console.log("Close Row NO GOOD");
      return;
    }
  };

  await closeRow();
  await closeTab();
  await clearSearch();

  return true;
};

const checkShekels = async (page) => {
  const element = await page.waitForSelector("#UCLeftAmount");
  const value = await element.evaluate((el) => el.textContent);
  if (value) {
    daily_amount = parseInt(value.replace("₪", ""));
    if (!isNaN(daily_amount)) {
      is_daily_good = daily_amount === 150;
    }
  }
};

const checkPopup = async (page) => {
  const closePopup = async (popup) => {
    try {
      await page.click("input[id=divSubmitLogin]");
    } catch (error) {
      return;
    }
  };
  const popups = ["#divClose", "#btnCloseMessageWindow"];
  for (let index = 0; index < popups.length; index++) {
    const popup = popups[index];
    await closePopup(popup);
  }
  return true;
};

const completeOrder = async (page) => {
  console.log("completing order");
  await page.waitForSelector("#divOrderButton");
  await page.click("#divOrderButton");
  await page.waitForSelector(".divSendOrdders");
  await page.click(".divSendOrdders");
  await delay(10000);
  const element = await page.waitForSelector("#UCLeftAmount");
  const value = await element.evaluate((el) => el.textContent);
  we_spent = parseInt(value.replace("₪", ""));
  if (isNaN(we_spent)) {
    we_spent = 0;
  }

  console.log(`completing order we have left ${we_spent}`);
  return true;
};

const goToTakeAway = async (page) => {
  await page.waitForSelector("div[id=divTioTakAwayTab]");
  await page.click("div[id=divTioTakAwayTab]");
  await page.waitForSelector("#divNoSearchResultMessage");
  await page.waitForSelector("#divNoSearchResultMessage", { hidden: true });
  await page.waitForSelector("#txbInnerHomeSearch");
};

const triggerSearchText = (searchText) => {
  const wrapper = $("#txbInnerHomeSearch");
  wrapper.focus().val(searchText).trigger("keyup");
};

const enterStore = () => {
  const wait_until_element_appear = setInterval(() => {
    if ($(".RLOuterRow:visible:first").length) {
      $(".RLOuterRow:visible:first img").click();
      clearInterval(wait_until_element_appear);
    }
  }, 0);
};

const findCheapestRow = (ma) => {
  const maxAmount = parseInt(ma);
  let minValue;
  let minItem;
  let minItemIndex;
  $(".RLMealPrice").each(function (index) {
    const val = parseInt($(this).html(), 10);
    if (val && (!minItem || val < minValue)) {
      minItem = this;
      minItemIndex = index;
      minValue = val;
    }
  });

  if (minValue < maxAmount) {
    let sibling = $(minItem).parents("#MLMealPrice")[0];
    $(sibling).siblings(".OrderButton").click();
    return { minItem, minItemIndex, minValue };
  } else {
    return { minItemIndex: -1 };
  }
};

const checkSuper = async (page, market) => {
  const { searchText } = market;
  await page.evaluate(triggerSearchText, searchText);
  await delay(1000);
  await page.evaluate(enterStore);
  await delay(2000);
  await page.waitForSelector(voucherRow);
  await page.click(voucherRow);
  await delay(2000);

  const { minItemIndex } = await page.evaluate(
    findCheapestRow,
    process.env.MAX_AMOUNT
  );

  if (minItemIndex !== -1) {
    voucherToBuy = minItemIndex;
  }
};

const checkSupers = async (page) => {
  const supers = process.env.SUPERMARKETS.split(",");
  for (let index = 0; index < supers.length; index++) {
    const market = supers[index];
    if (voucherToBuy !== "") {
      break;
    }
    if (index > 0) {
      await closeTabs(page);
    }
    await goToTakeAway(page);
    await checkSuper(page, supersConfig[market]);
  }
};

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await initialiseBroswer(browser, page);
  await checkPopup(page);
  await checkShekels(page);
  if (is_daily_good) {
    await checkSupers(page);
    if (voucherToBuy !== "") {
      await completeOrder(page);
    }
  }

  //   const rows = await readXlsxFile("semrush.xlsx");
  await browser.close();
})();
