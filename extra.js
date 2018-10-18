(function(config) {
  (function(info) {
    (function(page) {
      page.userPageName = "Shopping Cart";
      page.userData = {
        "username": adrumHelper.person.username,
        "email": adrumHelper.person.email
      };
      page.userDataLong = {
        "numberOfProducts": adrumHelper.ints.below100
      };
      page.userDataDouble = {
        "monthlyVisitFrequency": adrumHelper.floats.below1
      };
      page.userDataBoolean = {
        "returnCustomer": adrumHelper.bool
      };
      page.userDataDate = {
        "checkoutTime": ((new Date()).getTime())
      }
    })(info.PageView || (info.PageView = {}));
  })(config.userEventInfo || (config.userEventInfo = {}))
})(window['adrum-config'] || (window['adrum-config'] = {}));
