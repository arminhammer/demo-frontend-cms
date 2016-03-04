<template>
    <div>
        <div class="col-sm-12">
            <h1>The Pet Store</h1>
        </div>

        <div class="alert alert-danger" v-if="error">
            <p>{{ error }}</p>
        </div>

        <div v-if="user.authenticated">

            <!-- Pet List -->
            <div class="col-sm-12">
                <h1>Pet Inventory</h1>
                <div v-if="pets">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <td>Type</td>
                                <td>Name</td>
                                <td>Age</td>
                            </tr>
                        </thead>
                        <tr v-for="pet in pets">
                            <td>{{ pet.petType }}</td>
                            <td>{{ pet.petName }}</td>
                            <td>{{ pet.petAge }}</td>
                        </tr>
                    </table>
                </div>
            </div>

            <div class="col-sm-6 col-sm-offset-3">
                <div class="panel panel-default">
                    <div class="panel-body">
                        <h2>Add a Pet</h2>
                        <div class="alert alert-danger" v-if="error">
                            <p>{{ error }}</p>
                        </div>
                        <div class="form-group">
                            <input
                            type="text"
                            class="form-control"
                            placeholder="Enter pet type"
                            v-model="newPet.petType"
                            >
                        </div>
                        <div class="form-group">
                            <input
                            type="text"
                            class="form-control"
                            placeholder="Enter pet name"
                            v-model="newPet.petName"
                            >
                        </div>
                        <div class="form-group">
                            <input
                            type="number"
                            min="0"
                            step="1"
                            class="form-control"
                            placeholder="Enter pet age"
                            v-model="newPet.petAge"
                            >
                        </div>
                        <button class="btn btn-primary" @click="addPet()">Add Pet</button>
                    </div>
                </div>
            </div>

        </div>

    </div>
</template>

<script>
// import 'script!../api/apiGateway-js-sdk/lib/apiGatewayCore/apiGatewayClient';

import auth from '../auth/auth'
import {apigClientFactory} from '../api/apiwrapper'

console.log('apigClientFactory');
console.log(apigClientFactory);

export default {
    data() {
        return {
            newPet: {
                petType: '',
                petName: '',
                petAge: ''
            },
            error: '',
            pets: {},
            user: auth.user
        }
    },
    ready: function() {
        console.log('Pet Page is ready!');
        var loggedIn = auth.isStillLoggedIn();
        if (loggedIn) {
            auth.user.authenticated = true;
            this.getPets();
        } else {
            auth.logout()
        }
        console.log('Logged in:', loggedIn);
    },
    methods: {
        addPet() {
            let self = this;

            let accessKey = localStorage.getItem('accessKey')
            let secretKey = localStorage.getItem('secretKey')
            let sessionToken = localStorage.getItem('sessionToken')
            /* console.log('Credentials');
            console.log(accessKey);
            console.log(secretKey);
            console.log(sessionToken);
            // console.log(JSON.stringify(credentials));
            */

            // if (auth.user.authenticated) {
            let apigClient = apigClientFactory.newClient({
                accessKey: accessKey,
                secretKey: secretKey,
                sessionToken: sessionToken
            });

            let requestBody = {
                petType: this.newPet.petType,
                petName: this.newPet.petName,
                petAge: this.newPet.petAge
            }

            apigClient
            .petsPost(null, requestBody)
            .then(function(result) {
                console.log('Pet added.');
                console.log(result);
                self.getPets();
            }).catch(function(err) {
                console.log('There was an error');
                console.log(err);
                self.error = err;
            });
        },
        getPets() {
            let self = this;

            let accessKey = localStorage.getItem('accessKey')
            let secretKey = localStorage.getItem('secretKey')
            let sessionToken = localStorage.getItem('sessionToken')

            let apigClient = apigClientFactory.newClient({
                accessKey: accessKey,
                secretKey: secretKey,
                sessionToken: sessionToken
            });

            apigClient
            .petsGet()
            .then(function(result) {
                console.log('Got pet list');
                console.log(result);
                console.log('this');
                console.log(this);
                self.pets = result.data.pets;
            }).catch(function(err) {
                console.log('There was an error');
                console.log(err);
                self.error = err;
            });
        }
    },
    route: {
        // Check the users auth status before
        // allowing navigation to the route
        canActivate() {
            return auth.user.authenticated
        }
    }
}
</script>
