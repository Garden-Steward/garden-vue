<script setup>
import { ref } from 'vue';

const faqs = ref([
    { question: "How do I use Garden Steward?", answer: "Garden Steward is an SMS app for managing communal gardens. For most users all you need to do is sign up to a garden, and Garden Steward will send you reminders of volunteer days. Garden Steward also manages tasks for the garden, if you're ever confused you can respond: OPTIONS.", open: false },
    { question: "Do I need to reply in ALL CAPS?", answer: "No! Garden Steward is case insensitive. We use caps to be clear what commands are accepted. So if you reply 'yes' or 'no' you will be understood.", open: false },
    { question: "How do I sign up to a garden?", answer: "You can sign up to a garden by messaging Garden Steward with the garden name. If the garden is not already in your account, Garden Steward will add it for you. The last garden name you SMS will be your 'Active Garden'", open: false },
    { question: "I want to STOP receiving texts", answer: "You can do that by messaging Garden Steward with STOP. Our app will remove you from all gardens and our SMS partner Twilio will make sure you no longer receive texts from our app even if we try.", open: false },
    { question: "I have been assigned a task I can't do", answer: "That's fine! NO, and SKIP are the most popular options. With NO you will get a list of other volunteers you can then reassign the task to. If you feel the task doesn't need to be done, you can reply SKIP.", open: false },
    { question: "I'm about to go on Vacation", answer: "We're excited about it! Garden Steward will pause your account from receiving tasks, just message VACATION. When you return, just message Garden Steward with BACK.", open: false }
]);

const toggle = (index) => {
    console.log('clicked')
    faqs.value[index].open = !faqs.value[index].open;
};
</script>

<template>
    <div class="max-w-xl w-full mx-auto mt-8 stew">
        <h1 class="text-2xl pb-5 pt-2 text-center uppercase font-roboto">using garden steward</h1>
        <div v-for="(item, index) in faqs" :key="index" class="faq-item">
            <h2 class="faq-question py-4" @click="toggle(index)">
                {{ item.question }}
                <span :class="{'caret-down caret': !item.open, 'caret-up caret': item.open}"></span>
            </h2>
            <transition name="fade">
                <p class="faq-answer p-2 text-lg" v-show="item.open">{{ item.answer }}</p>
            </transition>
        </div>
    </div>
</template>

<style>

.faq-question {
    font-family: 'Roboto', sans-serif;
    font-size: 1.25rem; /* 20px */
    font-weight: 700;
    cursor: pointer;
    padding: 10px;
    margin-bottom: 0.5rem;
    border-radius: 5px; /* Optional: adds rounded corners */
    box-shadow: 0 4px 6px rgba(0,0,0,0.1); /* This creates the lifted effect */
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.caret {
    margin-right: 5px;
}

.caret-down::after, .caret-up::after {
    content: '';
    display: inline-block;
    width: 10px;
    height: 10px;
    border-left: 2px solid black;
    border-bottom: 2px solid black;
    margin-left: 5px;
    transform: rotate(135deg);
}

.caret-up::after {
    transform: rotate(-45deg);
}

.faq-item {
    margin-bottom: 1rem; /* Adds space between each FAQ item */
    border: 1px solid #e0e0e0; /* Light grey border */
    border-radius: 5px; /* Matches the border-radius of the question */
    overflow: hidden; /* Ensures the shadow and border contain the child elements */
}

.faq-answer {
    font-family: 'Roboto', sans-serif;
    font-size: 1rem; /* 16px */
    margin-top: 0;
}

.fade-enter-active, .fade-leave-active {
    transition: opacity 0.5s; /* Default duration for both enter and leave */
}

.fade-leave-active {
    transition: opacity 0.2s; /* Shorter duration specifically for fade-out */
}

.fade-enter-from, .fade-leave-to {
    opacity: 0;
}

.fade-enter-to {
    opacity: 1;
}

.h1 {
    font-family: 'Roboto', sans-serif; /* Ensures the font is Roboto */
    font-size: 2.5rem; /* Makes the font size larger */
    text-transform: uppercase; /* Converts text to uppercase */
    padding-bottom: 5px;
    padding-top: 2px;
    text-align: center; /* Centers the title */
}
</style>
