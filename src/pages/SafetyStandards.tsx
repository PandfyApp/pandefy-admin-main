import { Link } from 'react-router-dom'
import Button from '../components/ui/button'

export default function SafetyStandards() {
  return (
    <div className="min-h-screen bg-background py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-card rounded-lg border border-border shadow-sm p-8">
        <div className="flex justify-between items-center mb-8 border-b border-border pb-4">
          <h1 className="text-3xl font-bold text-foreground">Pandefy Community Safety Standards</h1>
          <Link to="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>

        <div className="space-y-8 text-foreground/90">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-primary">Introduction</h2>
            <p className="leading-relaxed">
              At Pandefy, we are committed to creating a safe, inclusive, and respectful environment for all our users. 
              These Safety Standards outline the behavior we expect from our community and the measures we take to ensure your safety. 
              By using Pandefy, you agree to adhere to these guidelines.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-primary">Prohibited Conduct</h2>
            <p className="mb-4">
              To maintain a safe community, the following behaviors and content are strictly prohibited on Pandefy:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Bullying and Harassment:</strong> We do not tolerate any form of bullying, harassment, or intimidation. This includes targeting individuals with unwanted messages, insults, or threats.</li>
              <li><strong>Hate Speech:</strong> Content that promotes violence or hatred against individuals or groups based on race, ethnicity, religion, gender, sexual orientation, disability, or age is forbidden.</li>
              <li><strong>Nudity and Sexual Content:</strong> We strictly prohibit pornography, sexually explicit content, and the solicitation of sexual acts.</li>
              <li><strong>Violence and Illegal Activities:</strong> Content that promotes, glorifies, or encourages violence, self-harm, or illegal acts is not allowed.</li>
              <li><strong>Misinformation:</strong> Spreading false information that causes harm or public panic is prohibited.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-primary">Age Requirement</h2>
            <p className="leading-relaxed">
              Pandefy is intended for users who are at least <strong>13 years old</strong>. 
              If we discover that a user is under the age of 13, we will immediately delete their account and associated data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-primary">Reporting and Blocking</h2>
            <p className="mb-4">
              We empower our users to protect themselves and help us maintain community standards:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Blocking:</strong> You can block any user to stop receiving messages or seeing their content. This can be done directly from their profile or within a chat.</li>
              <li><strong>Reporting:</strong> If you encounter content or behavior that violates these standards, please report it immediately using the in-app reporting feature. You can report specific posts, messages, or user profiles.</li>
            </ul>
            <p className="mt-4">
              Our safety team reviews reports within <strong>24 hours</strong> and takes appropriate action.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-primary">Enforcement and Consequences</h2>
            <p className="leading-relaxed">
              Violations of these Safety Standards are taken seriously. Depending on the severity and frequency of the violation, we may take the following actions:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Removing the violating content.</li>
              <li>Issuing a warning to the user.</li>
              <li>Temporarily suspending the user's account.</li>
              <li>Permanently banning the user from Pandefy.</li>
              <li>Reporting illegal content to law enforcement authorities.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-primary">Contact Us</h2>
            <p className="leading-relaxed">
              If you have any questions about these Safety Standards or need to report a safety concern directly, please contact our support team:
            </p>
            <div className="mt-4 p-4 bg-muted rounded-md inline-block">
              <p className="font-medium">Email: <a href="mailto:support@pandefy.com" className="text-blue-600 hover:underline">support@pandefy.com</a></p>
            </div>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-foreground/60">
          <p>&copy; {new Date().getFullYear()} Pandefy. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
