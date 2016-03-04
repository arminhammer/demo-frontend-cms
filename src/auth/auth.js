import {router} from '../main'
// import {apiwrapper} from '../api/apiwrapper'
// import {apigClientFactory} from '../api/apiGateway-js-sdk/apigClient'
// URL and endpoint constants
/* const API_URL = 'http://localhost:3001/'
const LOGIN_URL = API_URL + 'sessions/create/'
const SIGNUP_URL = API_URL + 'users/' */

const API_URL = 'https://sfoehx6z94.execute-api.us-east-1.amazonaws.com/PetStoreProd/'
const LOGIN_URL = API_URL + 'login'
const SIGNUP_URL = API_URL + 'users'

// let apiClient = apigClient().newClient();
// let apigClient;

// console.log('apiwrapper');
// console.log(apiwrapper.getClient());

// console.log('apigClientFactory');
// console.log(apigClientFactory);

/*
let apiClient = apigClientFactory.newClient();
console.log(apiClient);
*/

// import System from 'systemjs';

// System.transpiler = 'traceur';

// loads './app.js' from the current directory
/* System.import('../api/apiGateway-js-sdk/apigClient.js').then(function(m) {
console.log(m);
});*/

/* function createAPIGClient() {
    return apigClientFactory.newClient();
} */

function isStillLoggedIn() {
    var expirationTime = localStorage.getItem('expiration');
    if (expirationTime) {
        var now = Date.now();
        console.log('It is now', now);
        console.log('Token will expire in', expirationTime);
        let left = expirationTime - now;
        console.log('Left:', left);
        if (left > 0) {
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
}

export default {

    // User object will let us check authentication status
    user: {
        authenticated: false
    },

    isStillLoggedIn: isStillLoggedIn,

    // Send a request to the login URL and save the returned JWT
    login(context, creds, redirect) {
        context.$http.post(LOGIN_URL, creds, (data) => {
            console.log('data');
            console.log(data);
            console.log(data.identityId);
            console.log(data.credentials);
            console.log(data.token);
            // localStorage.setItem('id_token', data.id_token)
            localStorage.setItem('identityId', data.identityId)
            // localStorage.setItem('credentials', data.credentials)

            localStorage.setItem('accessKey', data.credentials.accessKey);
            localStorage.setItem('secretKey', data.credentials.secretKey);
            localStorage.setItem('sessionToken', data.credentials.sessionToken);

            localStorage.setItem('expiration', data.credentials.expiration);

            console.log('expiration');
            console.log(data.credentials.expiration);

            console.log(new Date(data.credentials.expiration));

            localStorage.setItem('token', data.token)

            this.user.authenticated = true

            /* console.log('Before');
            console.log(this.api.client);

            this.api.client = createAPIGClient();

            console.log('After');
            console.log(this.api.client);
            */
            // Redirect to a specified route
            if (redirect) {
                router.go(redirect)
            }
        }).error((err) => {
            console.log(err);
            context.error = err.errorMessage
        })
    },

    signup(context, creds, redirect) {
        context.$http.post(SIGNUP_URL, creds, (data) => {
            console.log('data');
            console.log(data);
            console.log(data.identityId);
            console.log(data.credentials);
            console.log(data.token);

            // localStorage.setItem('id_token', data.id_token)
            localStorage.setItem('identityId', data.identityId)
            // localStorage.setItem('credentials', data.credentials)

            localStorage.setItem('accessKey', data.credentials.accessKey);
            localStorage.setItem('secretKey', data.credentials.secretKey);
            localStorage.setItem('sessionToken', data.credentials.sessionToken);

            localStorage.setItem('expiration', data.credentials.expiration);

            localStorage.setItem('token', data.token)

            this.user.authenticated = true

            if (redirect) {
                router.go(redirect)
            }
        }).error((err) => {
            context.error = err.errorMessage
        })
    },

    // To log out, we just need to remove the token
    logout() {
        localStorage.removeItem('identityId')

        // localStorage.removeItem('credentials')
        localStorage.removeItem('accessKey')
        localStorage.removeItem('secretKey')
        localStorage.removeItem('sessionToken')
        localStorage.removeItem('expiration')

        localStorage.removeItem('token')
        // localStorage.removeItem('id_token')
        this.user.authenticated = false
    },

    checkAuth() {
        // var jwt = localStorage.getItem('id_token')
        var auth = localStorage.getItem('identityId')
        if (auth) {
            this.user.authenticated = true
        } else {
            this.user.authenticated = false
        }
    }

    // The object to be passed as a header for authenticated requests
    /* getAuthHeader() {
        return {
            'Authorization': 'Bearer ' + localStorage.getItem('identityId')
        }
    }*/
}
