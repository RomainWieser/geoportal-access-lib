/**
 * Creation d'une requête OpenLS en mode POST ou GET
 * (Factory)
 *
 * @module DirectGeocodeRequestFactory
 * @alias Gp.Services.Geocode.Request.DirectGeocodeRequestFactory
 * @private
 */
define([
    "Utils/LoggerByDefault",
    "Formats/XLS",
    "Formats/XLS/LocationUtilityService",
    "Formats/XLS/LocationUtilityService/GeocodeFilterExtension",
    "Services/Geocode/Request/model/StreetAddress",
    "Services/Geocode/Request/model/PositionOfInterest",
    "Services/Geocode/Request/model/CadastralParcel",
    "Services/Geocode/Request/model/Administratif"
],
function (
    Logger,
    XLS,
    LocationUtilityService,
    GeocodeFilterExtension,
    StreetAddress, PositionOfInterest, CadastralParcel, Administratif
    ) {

    "use strict";

    var DirectGeocodeRequestFactory = {

        /**
        * interface unique
        *
        * @method build
        * @static
        * @param {Object} options - options definies dans le composant Geocode
        *
        * @example
        *   var options = {
        *      httpMethod:
        *      // options specifiques du service
        *      location:
        *      returnFreeForm:
        *      filterOptions:
        *      srs:
        *      maximumResponses:
        *   };
        *   var result = DirectGeocodeRequestFactory.build(options);
        *   if(!result) {
        *       // error...
        *   }
        * @returns {String} request
        */
        build : function (options) {

            // logger
            var logger = Logger.getLogger("DirectGeocodeRequestFactory");
            logger.trace(["DirectGeocodeRequestFactory::build()"]);

            var request = null;

            // gestion des filtres (table de geocodage) !
            // par defaut, on les ajoute toute ...
            var oFilter = new GeocodeFilterExtension();
            oFilter.addFilterExtensions(new Administratif());
            oFilter.addFilterExtensions(new StreetAddress());
            oFilter.addFilterExtensions(new PositionOfInterest());
            oFilter.addFilterExtensions(new CadastralParcel());

            // objet LUS
            // on peut aussi par un objet XLS::GeocodeRequest
            var oLUS = new LocationUtilityService({
                location : options.location,
                returnFreeForm : options.returnFreeForm,
                filterOptions : options.filterOptions
            });
            oLUS.addFilter(oFilter);

            // Format XLS
            var oXLS = new XLS({
                srsName : options.srs,
                maximumResponses : options.maximumResponses
            });
            oXLS.namespace = true;
            oXLS.setService(oLUS);

            // request brute !
            request = oXLS.build();

            // en mode GET, la requête est encodée
            // et le param. 'qxml' est ajouté
            if (options.httpMethod == "GET") {
                var myRequest = "qxml=" +
                    encodeURIComponent(request)
                        .replace(/\-/g, "%2D")
                        .replace(/\_/g, "%5F")
                        .replace(/\./g, "%2E")
                        .replace(/\!/g, "%21")
                        .replace(/\~/g, "%7E")
                        .replace(/\*/g, "%2A")
                        .replace(/\'/g, "%27")
                        .replace(/\(/g, "%28")
                        .replace(/\)/g, "%29");
                request = myRequest;
            }

            logger.trace(request);

            return request;
        }
    };

    return DirectGeocodeRequestFactory;

});
