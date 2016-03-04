<template>
    <!--<div>
    <nav class="navbar navbar-default">
    <div class="container">
    <ul class="nav navbar-nav">
    <li><a v-link="'home'">Home</a></li>
    <li v-if="!user.authenticated"><a v-link="'login'">Login</a></li>
    <li v-if="!user.authenticated"><a v-link="'signup'">Sign Up</a></li>
    <li v-if="user.authenticated"><a v-link="'pets'">Pets</a></li>
    <li v-if="user.authenticated"><a v-link="'login'" @click="logout()">Logout</a></li>
</ul>
</div>
</nav>
<div class="container">
<router-view></router-view>
</div>
</div>-->

<div class="container">
    <div class="header clearfix">
        <nav>
            <ul class="nav nav-pills pull-right">
                <!--<li v-if="!user.authenticated" role="presentation" ><a v-link="'home'">Home</a></li>-->
                <li role="presentation" v-if="!user.authenticated"><a v-link="'login'">Login</a></li>
                <li role="presentation" v-if="!user.authenticated"><a v-link="'signup'">Sign Up</a></li>
                <li role="presentation" v-if="user.authenticated"><a v-link="'pets'">Pets</a></li>
                <li role="presentation" v-if="user.authenticated"><a v-link="'login'" @click="logout()">Logout</a></li>

                <!--<li role="presentation" class="active"><a href="#">Home</a></li>
                <li role="presentation"><a href="#">About</a></li>
                <li role="presentation"><a href="#">Contact</a></li>-->
            </ul>
        </nav>
        <h3 class="text-muted">Demo Petstore</h3>
    </div>

    <div class="container">
        <router-view></router-view>
    </div>

    <!--
    <div class="jumbotron">
    <h1>Jumbotron heading</h1>
    <p class="lead">Cras justo odio, dapibus ac facilisis in, egestas eget quam. Fusce dapibus, tellus ac cursus commodo, tortor mauris condimentum nibh, ut fermentum massa justo sit amet risus.</p>
    <p><a class="btn btn-lg btn-success" href="#" role="button">Sign up today</a></p>
</div>

<div class="row marketing">
<div class="col-lg-6">
<h4>Subheading</h4>
<p>Donec id elit non mi porta gravida at eget metus. Maecenas faucibus mollis interdum.</p>

<h4>Subheading</h4>
<p>Morbi leo risus, porta ac consectetur ac, vestibulum at eros. Cras mattis consectetur purus sit amet fermentum.</p>

<h4>Subheading</h4>
<p>Maecenas sed diam eget risus varius blandit sit amet non magna.</p>
</div>

<div class="col-lg-6">
<h4>Subheading</h4>
<p>Donec id elit non mi porta gravida at eget metus. Maecenas faucibus mollis interdum.</p>

<h4>Subheading</h4>
<p>Morbi leo risus, porta ac consectetur ac, vestibulum at eros. Cras mattis consectetur purus sit amet fermentum.</p>

<h4>Subheading</h4>
<p>Maecenas sed diam eget risus varius blandit sit amet non magna.</p>
</div>
</div>
-->

<footer class="footer">
    <p>&copy; 2015 Company, Inc.</p>
</footer>

</div> <!-- /container -->
</template>

<script>
import auth from '../auth/auth'
export default {
    data() {
        return {
            user: auth.user
        }
    },
    methods: {
        logout() {
            auth.logout()
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
    }
}
</script>

<!--<style>
html {
height: 100%;
}
body {
display: flex;
align-items: center;
justify-content: center;
height: 100%;
}
#app {
margin-top: -100px;
max-width: 600px;
font-family: Helvetica, sans-serif;
text-align: center;
}
.logo {
width: 100px;
height: 100px
}
</style>-->

<style>
/* Space out content a bit */
body {
    padding-top: 20px;
    padding-bottom: 20px;
}

/* Everything but the jumbotron gets side spacing for mobile first views */
.header,
.marketing,
.footer {
    padding-right: 15px;
    padding-left: 15px;
}

.v-link-active {
    color: #fff;
    background-color: #337ab7;
}

/* Custom page header */
.header {
    padding-bottom: 20px;
    border-bottom: 1px solid #e5e5e5;
}
/* Make the masthead heading the same height as the navigation */
.header h3 {
    margin-top: 0;
    margin-bottom: 0;
    line-height: 40px;
}

/* Custom page footer */
.footer {
    padding-top: 19px;
    color: #777;
    border-top: 1px solid #e5e5e5;
}

/* Customize container */
@media (min-width: 768px) {
    .container {
        max-width: 730px;
    }
}
.container-narrow > hr {
    margin: 30px 0;
}

/* Main marketing message and sign up button */
.jumbotron {
    text-align: center;
    border-bottom: 1px solid #e5e5e5;
}
.jumbotron .btn {
    padding: 14px 24px;
    font-size: 21px;
}

/* Supporting marketing content */
.marketing {
    margin: 40px 0;
}
.marketing p + h4 {
    margin-top: 28px;
}

/* Responsive: Portrait tablets and up */
@media screen and (min-width: 768px) {
    /* Remove the padding we set earlier */
    .header,
    .marketing,
    .footer {
        padding-right: 0;
        padding-left: 0;
    }
    /* Space out the masthead */
    .header {
        margin-bottom: 30px;
    }
    /* Remove the bottom border on the jumbotron for visual effect */
    .jumbotron {
        border-bottom: 0;
    }
}
</style>
