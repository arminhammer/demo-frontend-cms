import Vue from 'vue'
import App from './components/App'
import Login from './components/Login'
import Home from './components/Home'
import Signup from './components/Signup'
import Pets from './components/Pets'

import VueRouter from 'vue-router'
import VueResource from 'vue-resource'
Vue.config.debug = true

// import 'jquery'
// import 'expose?jQuery!jquery'
// import 'bootstrap'
// import '../node_modules/bootstrap/dist/css/bootstrap.css'
import 'expose?$!expose?jQuery!jquery';
import 'bootstrap-webpack';

Vue.use(VueResource)
Vue.use(VueRouter)

export var router = new VueRouter()

// Set up routing and match routes to components
router.map({
    '/home': {
        component: Home
    },
    '/login': {
        component: Login
    },
    '/signup': {
        component: Signup
    },
    '/pets': {
        component: Pets
    }
})

router.redirect({
    '*': '/home'
})

router.go('home')

router.start(App, '#app')
