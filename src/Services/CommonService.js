/**
 * desativation du contrôle cf. l. 254 (fonction call())
 * Possible strict violation. (W040)
 */

define([
    "Utils/LoggerByDefault",
    "Utils/Helper",
    "Utils/MessagesResources",
    "Protocols/Protocol",
    "Exceptions/ErrorService",
    "Services/DefaultUrlService"
],
function (
    Logger,
    Helper,
    _,
    Protocol,
    ErrorService,
    DefaultUrlService
) {

    "use strict";

    /**
     * @classdesc
     * Composant Service
     *
     * @constructor
     * @alias Gp.Services.CommonService
     * @param {Object} options - options communes à tous les services
     *
     * @param {String} options.apiKey - Clef d'accès à la plateforme Géoportail,
     *      nécessaire pour franchir la couche de contrôle des accès pour avoir une réponse du service invoqué.
     *      Plusieurs clefs peuvent être passées dans le cas de l'invocation du service d'autoconfiguration.
     *      Si ce paramètre n'est pas renseigné, alors le paramètre serverUrl doit être renseigné (comprenant alors, si nécessaire la clef API).
     *
     * @param {String} options.serverUrl - URL d'accès au service.
     *      Permet de forcer l'utilisation d'un service équivalent déployé derrière une éventuelle autre URL d'accès.
     *      Si ce paramètre est renseigné alors, le paramètre apiKey est ignoré.
     *
     * @param {String} [options.protocol] - Le protocole à utiliser pour récupérer les informations du service :
     *      peut valoir 'JSONP' ou 'XHR'.
     *      Par défaut, c'est le protocole JSONP qui sera utilisé.
     *
     * @param {String} [options.proxyURL] - Le proxy à utiliser pour pallier au problème de cross-domain dans le cas d'une requête XHR.
     *      Utile si le paramètre 'protocol' vaut 'XHR', il ne sera pas pris en compte si protocol vaut JSONP.
     *
     * @param {String} [options.callbackSuffix] - Suffixe de la fonction de callback à utiliser, dans le cas du protocole JSONP.
     *      Par défaut, la fonction de callback portera un nom du type "callback"+ID, où ID est soit un identifiant unique généré à chaque requête,
     *      soit le paramètre callbackSuffix s'il est spécifié. Par exemple, si callbackSuffix="_2", la fonction sera "callback_2()".
     *      Utile pour utiliser une réponse déjà encapsulée dans une fonction de callback, dont le nom est connu (ex: chargement de l'autoconfiguration en local)
     *      Utile seulement si le paramètre 'protocol' vaut 'JSONP', il ne sera pas pris en compte si protocol vaut 'XHR'.
     *
     * @param {String} [options.httpMethod] - La méthode HTTP
     *      à utiliser dans le cas d'une requête XHR : peut valoir 'GET' ou 'POST'.
     *      Non pris en compte si 'protocol' vaut JSONP qui fonctionne obligatoirement en GET.
     *      Par défaut, c'est la méthode GET qui est utilisée.
     *
     * @param {Number} [options.timeOut] - Délai d'attente maximal (en ms) de la réponse du service (à partir de l'envoi de la requête).
     *      Par défaut, aucun timeOut n'est pris en compte (timeoutDelay= 0).
     *
     * @param {Boolean} [options.rawResponse] - Indique si l'on souhaite que la réponse du service ne soit pas parsée par l'API avant d'être restituée.
     *      (Cf. paramètre « onSuccess » pour plus de détails).
     *
     * @param {Function} [options.onSuccess] - Fonction appelée lorsque le service répond correctement à la requête
     *      (code HTTP 200, sans message d'erreur).
     *      Cette fonction prend en paramètre la réponse du service,
     *      soit sous la forme d'un Object Javascript formaté par le parseur dédié à la syntaxe du service (comportement par défaut) ;
     *      soit brute au format String non prétraité si le paramètre « rawResponse » a été précisé avec la valeur « true ».
     *
     * @param {Function} [options.onFailure] - Fonction appelée lorsque le service ne répond pas correctement
     *      (code HTTP de retour différent de 200 ou pas de réponse).
     *
     * @example
     *   var options = {
     *      apiKey : null,
     *      serverUrl : 'http://localhost/service/',
     *      protocol : 'JSONP', // JSONP|XHR
     *      proxyURL : null,
     *      callbackName : null,
     *      httpMethod : 'GET', // GET|POST
     *      timeOut : 10000, // ms
     *      rawResponse : false, // true|false
     *      scope : null, // this
     *      onSuccess : function (response) {}
     *      onFailure : function (error) {}
     *   };
     * @private
     */
    function CommonService (options) {

        if (!(this instanceof CommonService)) {
            throw new TypeError(_.getMessage("CLASS_CONSTRUCTOR"));
        }

        this.logger = Logger.getLogger("CommonService");
        this.logger.trace("[Constructeur CommonService (options)]");

        // #####################
        // récupération des options par défaut pour les paramètres optionnels
        // #####################

        /**
         * Options du service
         * @type {Object}
         */
        this.options = {
            protocol : "JSONP",
            proxyURL : "",
            // callbackName : "",
            callbackSuffix : null,
            httpMethod : "GET",
            timeOut : 0,
            rawResponse : false,
            scope :  this,
            /** callback par defaut pour la reponse */
            onSuccess : function (response) {
                console.log("onSuccess - la reponse est la suivante : ", response);
            },
            /** callback par defaut pour les erreurs */
            onFailure : function (error) {
                if ( error.status === 200 || !error.status) {
                    console.log("onFailure : ", error.message);
                } else {
                    console.log("onFailure - Erreur (", error.status, ") : ", error.message);
                }
            }
        };

        // et on ajoute les options en paramètre aux options par défaut
        for ( var opt in options ) {
            if ( options.hasOwnProperty(opt) ) {
                this.options[opt] = options[opt];
            }
        }

        // #####################
        // analyse des options
        // #####################

        // gestion des clefs API
        if (!this.options.apiKey && !this.options.serverUrl) {
            throw new Error(_.getMessage("PARAM_MISSING", "apiKey", "serverUrl"));
        }

        // modification de la fonction de callback onSuccess dans le cas où la réponse brute est demandée
        if (this.options.rawResponse && !this.options.onSuccess) {
            /** callback onSuccess par defaut */
            this.options.onSuccess = function (response) {
                console.log("onSuccess - la réponse brute du service est la suivante : ", response);
            };
        }

        // gestion du callback onSuccess
        var bOnSuccess = (this.options.onSuccess !== null && typeof this.options.onSuccess === "function") ? true : false;
        if (!bOnSuccess) {
            throw new Error(_.getMessage("PARAM_MISSING", "onSuccess()"));
        }

        // gestion de l'url du service par defaut
        if (!this.options.serverUrl) {
            // INFO
            // gestion de l'url du service par defaut pour les services qui ne possèdent qu'une seul url par defaut
            // les cas particuliers des services avec plusieurs urls (ex. Alti) devront être traité dans la classe du composant
            // donc si l'url n'est pas renseignée, il faut utiliser les urls par defaut
            var urlByDefault = DefaultUrlService[this.CLASSNAME].url(this.options.apiKey);
            if ( typeof urlByDefault === "string" ) {
                this.options.serverUrl = urlByDefault;
            } else {
                this.logger.trace("URL par defaut à determiner au niveau du composant...");
            }
        }

        // nettoyage des KVP dans l'url du service
        if (this.options.serverUrl) {
            // INFO
            // si l'url est renseignée, il faut la nettoyer de tous ses KVP
            // ex. on ne veut pas de params. 'callback' ou 'output' car ceci declencherait
            // des opérations d'encapsulations des reponses légèrement farfelues ...
            var urlsource = this.options.serverUrl;
            var urlparts = urlsource.split("?");
            this.options.serverUrl = urlparts[0];
        }

        // gestion de la methode HTTP
        this.options.httpMethod = ( typeof options.httpMethod === "string" ) ? options.httpMethod.toUpperCase() : "GET";

        switch (this.options.httpMethod) {
            case "POST" :
            case "GET"  :
                break;
            case "PUT" :
            case "DELETE" :
            case "HEAD" :
            case "OPTIONS" :
                throw new Error(_.getMessage("PARAM_NOT_SUPPORT", "httpMethod"));
            default:
                throw new Error(_.getMessage("PARAM_UNKNOWN", "httpMethod"));
        }

        // gestion du protocole
        this.options.protocol = ( typeof options.protocol === "string" ) ? options.protocol.toUpperCase() : "JSONP";

        switch (this.options.protocol) {
            case "JSONP":
            case "XHR":
                break;
            default:
                throw new Error(_.getMessage("PARAM_UNKNOWN", "protocol"));
        }

        // le protocole JSONP ne fonctionne qu'en GET.
        if (this.options.protocol === "JSONP") {
            this.options.httpMethod = "GET";
        }

        // gestion du cache
        this.options.nocache = options.nocache || false;

        // #####################
        // attributs d'instances
        // #####################

        /**
         * Format de réponse du service
         */
        this.options.outputFormat = null;
        /**
         * Requête envoyée au service
         */
        this.request  = null;
        /**
         * Reponse du service
         */
        this.response = null;
    }

    /**
     * @lends module:CommonService
     */
    CommonService.prototype = {

        /*
         * Constructeur (alias)
         */
        constructor : CommonService,

        /**
         * Appel du service Géoportail
         */
        call : function () {

            /* jshint validthis: true */
            this.logger.trace("CommonService::call()");

            /** fonction d'execution */
            function run () {
                this.logger.trace("CommonService::run()");
                this.buildRequest.call(this, onError, onBuildRequest);
            }

            run.call(this);

            /** callback de fin de construction de la requête */
            function onBuildRequest (result) {
                this.logger.trace("CommonService::onBuildRequest : ", result);
                this.callService.call(this, onError, onCallService);
            }

            /** callback de fin d'appel au service */
            function onCallService (result) {
                this.logger.trace("CommonService::onCallService : ", result);
                this.analyzeResponse.call(this, onError, onAnalyzeResponse);
            }

            /** callback de fin de lecture de la reponse */
            function onAnalyzeResponse (result) {
                this.logger.trace("CommonService::onAnalyzeResponse : ", result);
                if (result) {
                    this.options.onSuccess.call(this, result);
                } else {
                    return onError.call(this, new ErrorService("Analyse de la reponse en échec !?"));
                }
            }

            /** callback de gestion des erreurs : renvoit un objet de type ErrorService */
            function onError (error) {
                this.logger.trace("CommonService::onError()");
                // error : l'objet est du type ErrorService ou Error
                var e = error;
                this.logger.error(e);
                if (!(e instanceof ErrorService)) {
                    e = new ErrorService(error.message);
                }
                this.options.onFailure.call(this, e);
            }

        },

        /**
         * Création de la requête
         */
        buildRequest : function (error, success) {
            // INFO
            // retourne l'objet 'this.request'
            // error.call(this, "This method must be overwritten !");
            this.logger.error("overwritten method !") ;
        },

        /**
         * Appel du service
         */
        callService : function (error, success) {
            // INFO
            // retourne l'objet 'this.response'

            // NOTES
            //  Pour le mode XHR, on recupère une reponse sous forme d'une string. Le content
            //  est donc du JSON natif ou du XML en fonction du service demandé (pas d'encapsulation !).
            //  Pour le mode JSONP, on a toujours un objet JSON mais sous 2 formats :
            //      - natif
            //      - XML encapsulé :
            //          {http : {status:200, error:null},xml :'réponse du service'}
            //          {http : {status:400, error:'reponse du service'},xml :null}
            //  En XHR, la reponse est directement sauvegardée dans 'this.response'.
            //  Par contre, en JSONP, on doit analyser la reponse (status ou non vide),
            //  et ne renvoyer que le contenu (xml ou l'objet)

            // gestion de la proxification du service
            var strUrlProxified  = null;
            var strData = this.request;

            // a t on mis en place un proxy ?
            // la proxyfication est valable uniquement en mode XHR !
            var bUrlProxified = (this.options.proxyURL && this.options.protocol === "XHR") ? true : false;

            // si le proxy est renseigné, on proxifie l'url du service
            if (bUrlProxified) {
                if (this.options.httpMethod === "GET") {
                    strUrlProxified  = this.options.proxyURL + Helper.normalyzeUrl(this.options.serverUrl, this.request, true);
                    strData = null;
                }

                if (this.options.httpMethod === "POST") {
                    strUrlProxified  = this.options.proxyURL + Helper.normalyzeUrl(this.options.serverUrl, null, true);
                    strData = this.request;
                }
            }

            // contexte du composant spécifique !
            var self = this;

            var options = {
                url          : strUrlProxified || this.options.serverUrl,
                method       : this.options.httpMethod,
                protocol     : this.options.protocol,
                timeOut      : this.options.timeOut || 0,
                format       : this.options.outputFormat,  // ceci declenche le parsing de la reponse du service, mais on souhaite toujours une reponse brute (string) !
                nocache      : this.options.nocache || false, // ceci permet d'ajouter un timestamp dans la requête
                wrap         : (this.options.protocol === "XHR") ? false : true, // ceci declenche l'encapsulation de la reponse XML du service dans du JSON, mais pas en mode XHR !
                callbackSuffix : this.options.callbackSuffix,
                // callbackName : this.options.callbackName || null,
                data         : strData,
                headers      : null,
                content      : null,
                scope        : this.options.scope || this,
                /** callback de reponse */
                onResponse : function (response) {
                    self.logger.trace("callService::onResponse()");

                    // le contenu de la reponse à renvoyer !
                    var content = null;

                    // XHR : on renvoie la reponse brute (string)
                    if (self.options.protocol == "XHR") {
                        // on ne peut pas savoir si la reponse est en XML ou JSON
                        // donc on laisse le boulot à l'analyse de la reponse !
                        content = response;
                    }

                    // JSONP : on doit analyser le contenu (json)
                    if (self.options.protocol == "JSONP") {
                        self.logger.trace("Response JSON", response);
                        if (response) {
                            // reponse encapsulée : {http : {status:200, error:null},xml :'réponse du service'}
                            if (response.http) {
                                if (response.http.status !== 200) {
                                    error.call(self, new ErrorService({
                                        status : response.http.status,
                                        message : response.http.error,
                                        type : ErrorService.TYPE_SRVERR
                                    }));
                                    return;
                                } else {
                                    content = response.xml;
                                }
                            } else {
                                content = response;
                            }
                        } else {
                            error.call(self, new ErrorService("Le contenu de la reponse est vide !?"));
                            return;
                        }
                    }

                    // sauvegarde de la reponse dans l'objet parent (CommonService)
                    self.response = content;

                    // on renvoie la reponse...
                    success.call(self, content);
                },
                /** callback des erreurs */
                onFailure : function (e) {
                    self.logger.trace("callService::onFailure()");
                    self.logger.error(e);
                    // on est forcement sur une erreur levée par un service !
                    e.type = ErrorService.TYPE_SRVERR;
                    error.call(self, new ErrorService(e));
                },
                /** callback de timeOut */
                onTimeOut : function () {
                    self.logger.trace("callService::onTimeOut()");
                    error.call(self, new ErrorService("TimeOut!"));
                }
            };

            Protocol.send(options);

        },

        /**
         * Analyse de la réponse
         */
        analyzeResponse : function (error, success) {
            // INFO
            // retourne l'objet spécifique au type de composant (json)
            // error.call(this, "This method must be overwritten !");
            this.logger.error("overwritten method !") ;
        }

    };

    return CommonService;
});
