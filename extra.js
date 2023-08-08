/**
 * Copyright 2020 Severin Neumann
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

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
