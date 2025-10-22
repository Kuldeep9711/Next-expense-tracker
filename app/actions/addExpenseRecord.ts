'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/prisma/lib/db';
import { revalidatePath } from 'next/cache';

interface RecordData {
  text: string;
  amount: number;
  category: string;
  date: string;
}

interface RecordResult {
  data?: RecordData;
  error?: string;
}

async function addExpenseRecord(formData: FormData): Promise<RecordResult> {
  const textValue = formData.get('text');
  const amountValue = formData.get('amount');
  const categoryValue = formData.get('category');
  const dateValue = formData.get('date');

  if (
    !textValue ||
    textValue === '' ||
    !amountValue ||
    !categoryValue ||
    categoryValue === '' ||
    !dateValue ||
    dateValue === ''
  ) {
    return { error: 'Text, amount, category, or date is missing' };
  }

  const text: string = textValue.toString();
  const amount: number = parseFloat(amountValue.toString());
  const category: string = categoryValue.toString();

  // convert input YYYY-MM-DD -> ISO (no timezone shift issues)
  let date: string;
  try {
    const inputDate = dateValue.toString();
    const [year, month, day] = inputDate.split('-');
    const dateObj = new Date(
      Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0)
    );
    date = dateObj.toISOString();
  } catch (error) {
    console.error('Invalid date format:', error);
    return { error: 'Invalid date format' };
  }

  // get clerk user id from Clerk auth
  const { userId } = await auth();

  if (!userId) {
    return { error: 'User not authenticated' };
  }

  try {
    // 1) Ensure the user exists in Prisma by clerkUserId
    let user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      // 2) Fetch user details from Clerk to get a real email (email is required/unique in your schema)
      //    clerkClient.users.getUser may throw if user not found, so wrap in try/catch
      let email = `unknown-${userId}@example.com`; // fallback if Clerk returns no email
      let name: string | undefined = undefined;
      let imageUrl: string | undefined = undefined;

      try {
        const clerkUser = await clerkClient.users.getUser(userId);
        // Clerk user structure: clerkUser.emailAddresses is array; find primary
        const primaryEmail =
          clerkUser.emailAddresses.find((e: any) => e.id === clerkUser.primaryEmailAddressId) ??
          clerkUser.emailAddresses[0];

       /* const primaryEmail = clerkUser.emailAddresses?.find((e) => e.primary) ?? clerkUser.emailAddresses?.[0]; */

        if (primaryEmail?.email) email = primaryEmail.email;
        name = clerkUser.firstName ?? clerkUser.fullName ?? undefined;
        imageUrl = clerkUser.profileImageUrl ?? undefined;
      } catch (clerkFetchError) {
        console.warn('Could not fetch user from Clerk; creating local user with fallback email.', clerkFetchError);
      }

      // create user record in prisma
      user = await db.user.create({
        data: {
          clerkUserId: userId,
          email, // must be unique per schema
          name,
          imageUrl,
        },
      });
    }

    // 3) Create the record using user.clerkUserId (Record.userId field references User.clerkUserId)
    const createdRecord = await db.record.create({
      data: {
        text,
        amount,
        category,
        date,
        userId: user.clerkUserId,
      },
    });

    const recordData: RecordData = {
      text: createdRecord.text,
      amount: createdRecord.amount,
      category: createdRecord.category,
      date: createdRecord.date?.toISOString() ?? date,
    };

    revalidatePath('/');
    return { data: recordData };
  } catch (error) {
    console.error('Error adding expense record:', error);
    return {
      error: 'An unexpected error occurred while adding the expense record.',
    };
  }
}

export default addExpenseRecord;




/*'use server';

import { auth } from '@clerk/nextjs/server';
import { db } from '@/prisma/lib/db';
import { revalidatePath } from 'next/cache';

interface RecordData {
  text: string;
  amount: number;
  category: string;
  date: string; // Added date field
}

interface RecordResult {
  data?: RecordData;
  error?: string;
}

async function addExpenseRecord(formData: FormData): Promise<RecordResult> {
  const textValue = formData.get('text');
  const amountValue = formData.get('amount');
  const categoryValue = formData.get('category');
  const dateValue = formData.get('date'); // Extract date from formData

  // Check for input values
  if (
    !textValue ||
    textValue === '' ||
    !amountValue ||
    !categoryValue ||
    categoryValue === '' ||
    !dateValue ||
    dateValue === ''
  ) {
    return { error: 'Text, amount, category, or date is missing' };
  }

  const text: string = textValue.toString(); // Ensure text is a string
  const amount: number = parseFloat(amountValue.toString()); // Parse amount as number
  const category: string = categoryValue.toString(); // Ensure category is a string
  // Convert date to ISO-8601 format while preserving the user's input date
  let date: string;
  try {
    // Parse the date string (YYYY-MM-DD format) and create a date at noon UTC to avoid timezone issues
    const inputDate = dateValue.toString();
    const [year, month, day] = inputDate.split('-');
    const dateObj = new Date(
      Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0)
    );
    date = dateObj.toISOString();
  } catch (error) {
    console.error('Invalid date format:', error); // Log the error
    return { error: 'Invalid date format' };
  }

  // Get logged in user
  const { userId } = await auth();

  // Check for user
  if (!userId) {
    return { error: 'User not found' };
  }

  try {
    // Create a new record (allow multiple expenses per day)
    const createdRecord = await db.record.create({
      data: {
        text,
        amount,
        category,
        date, // Save the date to the database
        userId,
      },
    });

    const recordData: RecordData = {
      text: createdRecord.text,
      amount: createdRecord.amount,
      category: createdRecord.category,
      date: createdRecord.date?.toISOString() || date,
    };

    revalidatePath('/');

    return { data: recordData };
  } catch (error) {
    console.error('Error adding expense record:', error); // Log the error
    return {
      error: 'An unexpected error occurred while adding the expense record.',
    };
  }
}

export default addExpenseRecord; */