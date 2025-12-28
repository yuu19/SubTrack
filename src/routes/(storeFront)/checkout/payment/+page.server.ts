import { SECRET_STRIPE_KEY } from '$env/static/private';
import { SHIPPING_FEE } from '$lib/constant.js';
import { redirect } from '@sveltejs/kit';
import Stripe from 'stripe';

const stripe = new Stripe(SECRET_STRIPE_KEY);
export const load = async ({ parent }) => {
	const { user } = await parent();
	if (!user || !user.cart) {
		redirect(303, '/');
	}

	const totalAmount =
		user.cart.cartItems.reduce(
			(total, item) => total + item.quantity * item.plan.price * 100,
			0
		) +
		SHIPPING_FEE * 100;
	console.log('🚀 ~ load ~ totalAmount:', totalAmount);

	const paymentIntent = await stripe.paymentIntents.create({
		amount: totalAmount,
		// note, for some EU-only payment methods it must be EUR
		currency: 'usd',
		// specify what payment methods are allowed
		// can be card, sepa_debit, ideal, etc...
		automatic_payment_methods: {
			enabled: true
		}
	});
	console.log('🚀 ~ load ~ paymentIntent:', paymentIntent);
	return {
		clientSecret: paymentIntent.client_secret
	};
};
