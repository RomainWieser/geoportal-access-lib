
define([
    "Utils/LoggerByDefault",
    "Utils/MessagesResources",
    "Utils/Helper",
    "Exceptions/ErrorService",
    "Services/CommonService",
    "Services/DefaultUrlService"
],
function (
    Logger,
    _,
    Helper,
    ErrorService,
    CommonService,
    DefaultUrlService
    ) {

    "use strict";

    /**
     * @classdesc
     * Appel du service WFS du Géoportail :
     *     envoi de la requête construite selon les paramètres en options,
     *     éventuellement parsing et analyse  de la réponse,
     *     retour d'une réponse en paramètre de la fonction onSuccess.
     *
     * @alias Gp.Services.WFS
     * @constructor
     * @extends {Gp.Services.CommonService}
     * @param {Object} options - options spécifiques au service (+ les options heritées)
     *
     *
     * @param {String} options.typeNames - Feature Type demandé
     *
     *
     * @param {Number} [options.count] - Nombre de réponses maximal que l'on souhaite recevoir.
     *      Si le serveur consulté est celui du Géoportail, la valeur par défaut sera donc celle du service : 1000.
     *
     *
     * @param {Number} [options.startIndex = 1] - Si indiqué, le serveur commencera à envoyer les feature à partir de cet index
     *
     * @param {String} [options.srs] - Système de coordonnées dans lequel les paramètres géographiques en entrée et la réponse du service sont exprimés.
     *      Pas de valeur par défaut. Si le serveur consulté est celui du Géoportail, la valeur par défaut sera donc celle du service : 'urn:ogc:def:crs:EPSG::4326'.
     *
     * @example
     *  var options = {
     *      // options communes aux services
     *      apiKey : null,
     *      serverUrl : 'http://localhost/service/',
     *      protocol : 'JSONP', // JSONP|XHR
     *      proxyURL : null,
     *      httpMethod : 'GET', // GET|POST
     *      timeOut : 10000, // ms
     *      rawResponse : false, // true|false
     *      scope : null, // this
     *      onSuccess : function (response) {},
     *      onFailure : function (error) {},
     *      // spécifique au service
     *      typeNames : 'BDTOPO_BDD_GLP_WGS84G:bati_indifferencie',
     *      featureID : 'bati_indifferencie.1',
     *      WFSoutputFormat : 'application/json'
     *      propertyName : 'id',
     *      sortBy : 'hauteur',
     *      srsName : 'urn:ogc:def:crs:EPSG::4326',
     *      BBOX : {
     *          left : 2.41,
     *          bottom : 48.83,
     *          right : 2.43,
     *          top : 48.85
     *      }
     *      count: 1,
     *      startIndex : 1
     *  };
     *
     * @private
     */
    function WFS (options) {

        if (!(this instanceof WFS)) {
            throw new TypeError(_.getMessage("CLASS_CONSTRUCTOR", "WFS"));
        }

        /**
         * Nom de la classe (heritage)
         * FIXME instance ou classe ?
         */
        this.CLASSNAME = "WFS";

        // appel du constructeur par heritage
        CommonService.apply(this, arguments);

        this.logger = Logger.getLogger("Gp.Services.WFS");
        this.logger.trace("[Constructeur WFS(options)]");

        // on lance une exception afin d'eviter au service de le faire...
        if ( !options.typeNames ) {
            throw new Error(_.getMessage("PARAM_MISSING", "typeNames"));
        }
        if ( typeof options.BBOX !== "undefined" ) {
            if ( !options.BBOX.left ) {
                throw new Error(_.getMessage("PARAM_MISSING", "BBOX.left"));
            }
            if ( !options.BBOX.bottom ) {
                throw new Error(_.getMessage("PARAM_MISSING", "BBOX.bottom"));
            }
            if ( !options.BBOX.right ) {
                throw new Error(_.getMessage("PARAM_MISSING", "BBOX.right"));
            }
            if ( !options.BBOX.top ) {
                throw new Error(_.getMessage("PARAM_MISSING", "BBOX.top"));
            }
        }

        // options par defaut
        this.options.typeNames = options.typeNames;
        this.options.featureID = options.featureID;
        this.options.WFSoutputFormat = options.WFSoutputFormat || "json";
        this.options.propertyName = options.propertyName;
        this.options.sortBy = options.sortBy;
        this.options.count = options.count;
        this.options.srsName = options.srsName;
        this.options.BBOX = options.BBOX;
    }

    /**
     * @lends module:WFS#
     */
    WFS.prototype = Object.create(CommonService.prototype, {
        // todo
        // getter/setter
    });

    /*
     * Constructeur (alias)
     */
    WFS.prototype.constructor = WFS;

    /**
     * (overwrite)
     * Création de la requête
     *
     * @param {Function} error   - callback des erreurs
     * @param {Function} success - callback
     */
    WFS.prototype.buildRequest = function (error, success) {

        // Surcharge de l'option BBOX
        if ( typeof this.options.BBOX !== "undefined" ) {
            this.options.BBOX = this.options.BBOX.left + "," +
                                this.options.BBOX.bottom + "," +
                                this.options.BBOX.right + "," +
                                this.options.BBOX.top;
        }

        // normalisation de la requete avec param KPV
        this.request = Helper.normalyzeParameters({
            request : "GetFeature",
            service : "WFS",
            version : "2.0.0",
            outputFormat : this.options.WFSoutputFormat,
            BBOX : this.options.BBOX,
            srsName : this.options.srsName,
            typeNames : this.options.typeNames,
            featureID : this.options.featureID,
            sortBy : this.options.sortBy,
            count : this.options.count,
            propertyName : this.options.propertyName
        });

        success.call(this, this.request);
    };

    /**
     * (overwrite)
     * Analyse de la reponse
     *
     * @param {Function} error   - callback des erreurs
     * @param {Function} success - callback
     */
    WFS.prototype.analyzeResponse = function (error, success) {

        if (this.response) {
            success.call(this, this.response);

        } else {
            error.call(this, new ErrorService(_.getMessage("SERVICE_RESPONSE_EMPTY")));
        }

    };

    return WFS;

});