<template>
    <div class="col-sm-6 col-sm-offset-3">
        <h1>Welcome to the Petstore!</h1>

        <div class="col-sm-6 col-sm-offset-3" v-if="!user.authenticated">
            Please <a v-link="'login'">log in</a> to continue.
        </div>

        <div v-else>
            View our pet store inventory <a v-link="'pets'">here</a>.
        </div>
    </div>
</template>

<script>
import auth from '../auth/auth'

export default {
    data() {
        return {
            quote: '',
            user: auth.user
        }
    },
    ready: function() {
        console.log('App Page is ready!');
        var loggedIn = auth.isStillLoggedIn();
        if (loggedIn) {
            auth.user.authenticated = true;
        } else {
            auth.logout()
        }
        console.log('Logged in:', loggedIn);
    },
    methods: {
        /* getQuote() {
        this.$http
        .get('http://localhost:3001/api/random-quote', (data) => {
        this.quote = data;
    })
    .error((err) => console.log(err))
} */
}

}
</script>
