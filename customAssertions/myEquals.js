 myEquals = function(whatItIS,whatItShouldBe,thingToTest) {
   console.log('did I get here?', whatItIS, whatItShouldBe, thingToTest);
    this.message = `Testing if ${thingToTest} is ${whatItShouldBe} actually ${whatItIS}`;

    this.expected = () => {
        return true;
    };

    this.pass = () => {
        return whatItShouldBe === whatItIS;
    };

    this.value = () => {
        return whatItShouldBe === whatItIS;
    };

    /**
    * The command which is to be executed by the assertion runner; Nightwatch api is available as this.api
    * @param {function} callback
    */
  this.command = function(callback) {
    setTimeout(function() {
      console.log('did I get here??',callback);
      callback(whatItIS,whatItShouldBe,thingToTest);
    }, 1000);
    return this;
 };
};

module.exports.assertion = myEquals;