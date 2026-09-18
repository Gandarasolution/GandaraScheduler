import axios from 'axios';
import Cookies from 'js-cookie';

/* Explications :

Un agent axios permet de faire des requête asynchrones à un serveur.

Si l'appel réussi, l'agent axios renvoie un objet représentant la réponse (NB: dans les fonction ci-dessous, on
met cet objet dans une variable nommée response). Cet objet contient un champ data, qui contient les données renvoyées
par l'API. Comme l'API renvoie toujours des données au format : {error: err_number, stats: http_status, data: ... }
on a donc :
   - response.data.error : permet de savoir s'il y a une erreur dans la requête
   - response.data.data : contient soit un message d'erreur, soit les données demandées.

En revanche, si l'appel à axios échoue, cela provoque la levée d'une exception avec un objet la
représentant (NB : variable nommée err dans le catch). Il y a 3 cas d'erreurs :
   - le serveur http renvoie un status != 2XX (par ex 404, 500). C'est par exemple le cas en cas de route invalide,
   quand les données demandées n'existent pas, ...
   - le serveur ne répond pas, malgré le fait que la requête soit partie,
   - impossible d'envoyer la requête
Ces trois cas sont traités par une unique fonction handleError().

 */


// creation d'un agent axios, avec une config. pour atteindre l'API
export const axiosAgent = axios.create({
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
})

axiosAgent.interceptors.request.use((config) => {
  const clientApiUrl = Cookies.get('client_api_url');

  if (clientApiUrl) {
    config.baseURL = clientApiUrl;
  }

  // Si la donnée est un FormData (donc un envoi de fichier)
  if (config.data instanceof FormData) {
      // On supprime le header forcé pour laisser le navigateur générer le 'multipart/form-data'
      delete config.headers['Content-Type'];
  }

  return config;
});

axiosAgent.interceptors.response.use(
    // 1. Si la réponse est un succès (2XX), on la laisse passer normalement
    (response) => response,
    
    // 2. Si la réponse est une erreur (4XX, 5XX)
    async (error) => {
        // Si l'erreur est 401 (Non autorisé / JWT expiré)
        if (error.response && error.response.status === 401) {
            window.dispatchEvent(new Event('auth:expired'));
        }

        // Si ce n'est pas une erreur 401, on la rejette pour que `handleError` s'en occupe
        return Promise.reject(error);
    }
);



function handleError(serviceName, err) {
    console.log("handleError called for service " + serviceName + " with error: " + err);
    if (err.response) {
        // la requête a été reçue par le serveur mais celui-ci renvoie un status != 2XX, ce qui signifie
        // une erreur. Par exemple, il peut renovyer un status 404 pour dire que la ressource demandée n'existe pas.
        console.log("ERROR while calling SERVICE " + serviceName + ": " + JSON.stringify(err.response));
        // on retourne un objet qui a la même structure qu'une réponse normale sans erreur.
        // mais avec un champ data contenant le message d'erreur renvoyé par l'API
        return {
            data: err.response.data
        };
    }
    else if (err.request) {
        // la requete a été envoyée mais aucune réponse reçue.
        console.log("NETWORK ERROR while calling SERVICE "+serviceName+ ": " + JSON.stringify(err.request));
        // on retourne un objet qui a la même structure qu'une réponse normale sans erreur.
        // mais avec un champ data contenant un message
        return {
            data: {
                error: 1,
                message: 'Le serveur est injoignable ou l\'URL demandée n\'existe pas'
            }
        };
    }
    else {
        // tout autre cas
        console.log("UNKNOWN ERROR while calling SERVICE "+serviceName);
        
        return {
            data: {
                error: 1,
                message: 'Erreur inconnue'
            }
        };
    }
}


async function getRequest(uri, name, config = {}) {
    let response = null
    try {
        response = await axiosAgent.get(uri, config)
    } catch (err) {
        // le catch se fait si le serveur répond avec une erreur type 4XX, 5XX, ou bien si le serveur est off
        // dans ce cas, on appelle la méthode pour traiter ces types d'erreurs et on met le résutlat dans response.
        response = handleError(name, err);
    }
    // on retourne les données dans response, qu'il y ait eu une erreur ou pas.
    return response.data;
}

async function postRequest(uri, data, name, config = {}) {
    let response = null
    try {
        response = await axiosAgent.post(uri, data, config)
    } catch (err) {
        // le catch se fait si le serveur répond avec une erreur type 4XX, 5XX, ou bien si le serveur est off
        // dans ce cas, on appelle la méthode pour traiter ces types d'erreurs
        response = handleError(name, err);
    }
    // on retourne les données dans response, qu'il y ait eu une erreur ou pas.
    return response.data;
}

async function patchRequest(uri, data, name, config={}) {
    let response = null
    try {
        response = await axiosAgent.patch(uri, data, config)
    } catch (err) {
        // le catch se fait si le serveur répond avec une erreur type 4XX, 5XX, ou bien si le serveur est off
        // dans ce cas, on appelle la méthode pour tr // le catch se fait si le serveur répond avec une erreur type 4XX, 5XX, ou bien si le serveur est off
        // dans ce cas, on appelle la méthode pour traiter ces types d'erreuraiter ces types d'erreurs
        response = handleError(name, err);
    }
    // on retourne les données dans response, qu'il y ait eu une erreur ou pas.
    return response.data;
}

async function putRequest(uri, data, name, config = {}){
    let response = null
    try {
        response = await axiosAgent.put(uri, data, config)
    } catch (err){
        response = handleError(name, err);
    }
    return response.data;
}

async function deleteRequest(uri, name, data ,config = {}){
    let response = null
    try {
        response = await axiosAgent.delete(uri, { ...config, data });
    } catch (err){
        response = handleError(name, err);
    }
    return response.data;
}

export {
    getRequest,
    postRequest,
    patchRequest,
    putRequest,
    deleteRequest
}